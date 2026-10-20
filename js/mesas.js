/* ═══════════════════════════════════════════
   MESAS.JS
   Gerenciamento de comandas/mesas abertas no balcão.
   Permite múltiplos pedidos abertos simultaneamente.
═══════════════════════════════════════════ */

const STORAGE_KEY_MESAS = 'dg-mesas-abertas';

let mesasAbertas  = {};   // { "Mesa 1": { snapshot }, "Mesa 2": {...} }
let mesaAtivaKey  = null; // chave da mesa em foco no momento

// ── PERSISTÊNCIA ──────────────────────────────────────────────

function carregarMesasStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESAS);
    mesasAbertas = raw ? JSON.parse(raw) : {};
  } catch (e) {
    mesasAbertas = {};
  }
}

function salvarMesasStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_MESAS, JSON.stringify(mesasAbertas));
  } catch (e) { /* silencia erros de quota */ }
}

// ── SNAPSHOT (captura / restaura o estado atual do carrinho) ──

function capturarSnapshotMesa() {
  return {
    nome:              mesaAtivaKey || '',
    pedidoId:          mesaPedidoAberto || null,
    clienteSelecionado: clienteSelecionado ? { ...clienteSelecionado } : null,
    itens:             [...carrinho],
    tipoEntrega:       'balcao', // mesas são sempre balcão
    formaPgto:         formaPgto,
    descInput:         document.getElementById('desc-input')?.value  || '',
    notaInput:         document.getElementById('nota-input')?.value  || '',
    taxaInput:         document.getElementById('taxa-input')?.value  || '',
  };
}

function restaurarSnapshotMesa(snap) {
  if (!snap) return;

  carrinho           = Array.isArray(snap.itens) ? [...snap.itens] : [];
  tipoEntrega        = snap.tipoEntrega  || 'balcao';
  formaPgto          = snap.formaPgto    || 'dinheiro';
  mesaAtual          = snap.nome         || '';
  mesaPedidoAberto   = snap.pedidoId     || null;
  clienteSelecionado = snap.clienteSelecionado || null;

  const mesaInput = document.getElementById('mesa-input');
  if (mesaInput) mesaInput.value = mesaAtual;

  const descInput = document.getElementById('desc-input');
  if (descInput) descInput.value = snap.descInput || '';

  const notaInput = document.getElementById('nota-input');
  if (notaInput) notaInput.value = snap.notaInput || '';

  const taxaInput = document.getElementById('taxa-input');
  if (taxaInput) taxaInput.value = snap.taxaInput || '';

  aplicarEstadoPedidoUI();
  renderCarrinho();
  calcTotal();
}

// ── AÇÕES DAS MESAS ──────────────────────────────────────────

function ativarMesa(key) {
  if (key === mesaAtivaKey) return; // já está ativa

  // Persiste o estado da mesa atual antes de trocar
  if (mesaAtivaKey && mesasAbertas[mesaAtivaKey]) {
    mesasAbertas[mesaAtivaKey] = capturarSnapshotMesa();
    salvarMesasStorage();
  }

  mesaAtivaKey = key;
  restaurarSnapshotMesa(mesasAbertas[key]);
  renderMesasPanel();
}

function criarMesa() {
  // prompt() não funciona no Electron — usa modal próprio
  const input = document.getElementById('nova-mesa-nome');
  if (input) {
    input.value = 'Mesa ' + (Object.keys(mesasAbertas).length + 1);
    abrirModal('modal-nova-mesa');
    setTimeout(() => { input.select(); input.focus(); }, 120);
  }
}

function confirmarNovaMesa() {
  const nome = document.getElementById('nova-mesa-nome')?.value?.trim();
  fecharModal('modal-nova-mesa');
  if (!nome) return;

  const key = nome;
  if (mesasAbertas[key]) {
    toast('Já existe uma comanda com esse nome!', 'error');
    return;
  }

  // Salva o estado da mesa atual antes de criar
  if (mesaAtivaKey && mesasAbertas[mesaAtivaKey]) {
    mesasAbertas[mesaAtivaKey] = capturarSnapshotMesa();
  }

  mesasAbertas[key] = {
    nome:              key,
    clienteSelecionado: null,
    itens:             [],
    tipoEntrega:       'balcao',
    formaPgto:         'dinheiro',
    descInput:         '',
    notaInput:         '',
    taxaInput:         '',
  };

  mesaAtivaKey = key;
  restaurarSnapshotMesa(mesasAbertas[key]);
  salvarMesasStorage();
  renderMesasPanel();
  toast(`🪑 Comanda "${key}" aberta!`);
}

function fecharMesaAtiva() {
  if (!mesaAtivaKey) {
    limparPedido();
    return;
  }

  delete mesasAbertas[mesaAtivaKey];
  salvarMesasStorage();

  const keys = Object.keys(mesasAbertas);
  if (keys.length > 0) {
    // Há outras mesas → ativa a primeira
    mesaAtivaKey = keys[0];
    restaurarSnapshotMesa(mesasAbertas[mesaAtivaKey]);
  } else {
    // Não há mais mesas → volta para carrinho vazio
    mesaAtivaKey = null;
    limparPedido();
  }

  renderMesasPanel();
}

function removerMesa(key) {
  if (!confirm(`Remover a comanda "${key}" e todos os itens?\n\nEssa ação não salva nenhum pedido.`)) return;

  delete mesasAbertas[key];
  salvarMesasStorage();

  if (key === mesaAtivaKey) {
    const keys = Object.keys(mesasAbertas);
    if (keys.length > 0) {
      mesaAtivaKey = keys[0];
      restaurarSnapshotMesa(mesasAbertas[mesaAtivaKey]);
    } else {
      mesaAtivaKey = null;
      limparPedido();
    }
  }

  renderMesasPanel();
  toast(`🗑️ Comanda "${key}" removida.`, 'info');
}

// ── RENDERIZAÇÃO ─────────────────────────────────────────────

function renderMesasPanel() {
  const panel = document.getElementById('mesas-panel');
  if (!panel) return;

  if (tipoEntrega !== 'balcao') {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'flex';

  const keys = Object.keys(mesasAbertas);
  let html = '';

  keys.forEach(key => {
    const snap    = mesasAbertas[key];
    const itens   = snap.itens || [];
    const total   = itens.reduce((a, i) => a + i.preco * i.qty, 0);
    const qtdItens = itens.reduce((a, i) => a + i.qty, 0);
    const ativa   = key === mesaAtivaKey;
    const nomeEsc = key.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    html += `
      <div class="mesa-tab${ativa ? ' mesa-tab-ativa' : ''}" onclick="ativarMesa('${nomeEsc}')">
        <div class="mesa-tab-header">
          <span class="mesa-tab-nome">${key}</span>
          <button class="mesa-tab-fechar" onclick="event.stopPropagation();removerMesa('${nomeEsc}')" title="Remover comanda">✕</button>
        </div>
        <span class="mesa-tab-info">${qtdItens > 0 ? qtdItens + ' it. · ' + fmt(total) : '— vazio —'}</span>
      </div>`;
  });

  html += `
    <button class="mesa-tab-add" onclick="criarMesa()" title="Abrir nova comanda">
      ＋ Nova Mesa
    </button>`;

  panel.innerHTML = html;
}

// ── SINCRONIZAÇÃO AUTOMÁTICA ─────────────────────────────────

// Chamado pelo renderCarrinho() para manter o snapshot sempre atualizado
function sincronizarMesaAtiva() {
  // Só sincroniza quando estiver no modo balcão — evita sobrescrever mesa com dados de retirada/delivery
  if (tipoEntrega !== 'balcao') return;
  if (!mesaAtivaKey || !mesasAbertas[mesaAtivaKey]) return;
  mesasAbertas[mesaAtivaKey] = capturarSnapshotMesa();
  salvarMesasStorage();
  // Atualiza os totais nas abas sem re-renderizar tudo pesadamente
  document.querySelectorAll('.mesa-tab').forEach(el => {
    const nome = el.querySelector('.mesa-tab-nome')?.textContent;
    if (!nome) return;
    const snap = mesasAbertas[nome];
    if (!snap) return;
    const itens   = snap.itens || [];
    const total   = itens.reduce((a, i) => a + i.preco * i.qty, 0);
    const qtdItens = itens.reduce((a, i) => a + i.qty, 0);
    const info = el.querySelector('.mesa-tab-info');
    if (info) info.textContent = qtdItens > 0 ? qtdItens + ' it. · ' + fmt(total) : '— vazio —';
  });
}

// ── INICIALIZAÇÃO ─────────────────────────────────────────────

function inicializarMesas() {
  carregarMesasStorage();

  const keys = Object.keys(mesasAbertas);
  if (keys.length > 0) {
    // Há mesas salvas → restaura a primeira
    mesaAtivaKey = keys[0];
    restaurarSnapshotMesa(mesasAbertas[mesaAtivaKey]);
  }

  renderMesasPanel();
}
