/* ═══════════════════════════════════════════
   ESTADO.JS
   Variáveis compartilhadas entre todo o sistema.
   Esse arquivo deve ser carregado ANTES de todos os outros JS.
═══════════════════════════════════════════ */

// Listas carregadas do banco de dados (SQLite)
let produtos = [];
let clientes = [];

// Pedido em andamento na tela de Venda
let carrinho = [];
let clienteSelecionado = null;
let tipoEntrega = 'balcao';   // balcao | retirada | delivery
let formaPgto   = 'dinheiro'; // dinheiro | pix | debito | credito
let mesaAtual = '';
let mesaPedidoAberto = null;  // ID do pedido aberto para a mesa atual (balcao)
let numPedidoAtual = 1;

// Snapshots de pedido em andamento por tipo (para preservar ao trocar de tipo)
let snapRetirada = null;
let snapDelivery = null;

// Filtro ativo no cardápio
let catAtual = 'todos';

const STORAGE_KEY_PEDIDO = 'dg-lanches-pdv-pedido';

function salvarEstadoPedido() {
  try {
    mesaAtual = document.getElementById('mesa-input')?.value || '';
    const estado = {
      carrinho,
      clienteSelecionado: clienteSelecionado ? {
        id: clienteSelecionado.id,
        nome: clienteSelecionado.nome,
        rua: clienteSelecionado.rua || '',
        num: clienteSelecionado.num || '',
        bairro: clienteSelecionado.bairro || '',
        cidade: clienteSelecionado.cidade || '',
        comp: clienteSelecionado.comp || ''
      } : null,
      tipoEntrega,
      formaPgto,
      descInput: document.getElementById('desc-input')?.value || '',
      notaInput: document.getElementById('nota-input')?.value || '',
      taxaInput: document.getElementById('taxa-input')?.value || '',
      mesaAtual,
      mesaPedidoAberto
    };
    localStorage.setItem(STORAGE_KEY_PEDIDO, JSON.stringify(estado));
    
    // Atualiza pedido aberto no banco SOMENTE se estiver no balcão
    if (typeof atualizarPedidoAberto === 'function' && mesaPedidoAberto && tipoEntrega === 'balcao') {
      atualizarPedidoAberto().catch(e => console.warn('Erro ao atualizar pedido aberto:', e));
    }
  } catch (e) {
    // Ignora falhas de persistência em ambientes sem localStorage
  }
}

function limparEstadoPedidoStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY_PEDIDO);
  } catch (e) {
    // Ignora falhas de persistência em ambientes sem localStorage
  }
}

function aplicarEstadoPedidoUI() {
  const display = document.getElementById('cliente-select-display');
  if (display) {
    if (clienteSelecionado) {
      display.textContent = clienteSelecionado.nome;
      display.classList.add('selected');
    } else {
      display.textContent = 'Sem cliente / Balcão';
      display.classList.remove('selected');
    }
  }

  document.querySelectorAll('.tipo-btn').forEach(btn => {
    const tipo = btn.textContent.includes('Delivery') ? 'delivery' : btn.textContent.includes('Retirada') ? 'retirada' : 'balcao';
    btn.classList.toggle('active', tipo === tipoEntrega);
  });

  document.querySelectorAll('.pgto-btn').forEach(btn => {
    const pgto = btn.textContent.includes('Pix') ? 'pix' : btn.textContent.includes('Débito') ? 'debito' : btn.textContent.includes('Crédito') ? 'credito' : 'dinheiro';
    btn.classList.toggle('active', pgto === formaPgto);
  });

  const taxaEntregaRow = document.getElementById('taxa-entrega-row');
  if (taxaEntregaRow) {
    taxaEntregaRow.style.display = tipoEntrega === 'delivery' ? 'flex' : 'none';
  }

  const descInput = document.getElementById('desc-input');
  if (descInput) descInput.value = descInput.value || '';

  const notaInput = document.getElementById('nota-input');
  if (notaInput) notaInput.value = notaInput.value || '';

  const taxaInput = document.getElementById('taxa-input');
  if (taxaInput) taxaInput.value = taxaInput.value || '';

  const mesaInput = document.getElementById('mesa-input');
  if (mesaInput) mesaInput.value = mesaAtual || '';

  const notaRow = document.getElementById('nota-row');
  const trocoRow = document.getElementById('troco-row');
  if (formaPgto === 'dinheiro') {
    if (notaRow) notaRow.style.display = 'flex';
  } else {
    if (notaRow) notaRow.style.display = 'none';
    if (trocoRow) trocoRow.style.display = 'none';
  }

  const taxaRow = document.getElementById('taxa-row');
  if (taxaRow) {
    taxaRow.style.display = tipoEntrega === 'delivery' ? 'flex' : 'none';
  }
}

function restaurarEstadoPedido() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PEDIDO);
    if (!raw) return false;

    const estado = JSON.parse(raw);
    if (!estado) return false;

    carrinho = Array.isArray(estado.carrinho) ? estado.carrinho : [];
    tipoEntrega = estado.tipoEntrega || 'balcao';
    formaPgto = estado.formaPgto || 'dinheiro';

    if (estado.clienteSelecionado) {
      const clienteSalvo = clientes.find(c => c.id === estado.clienteSelecionado.id);
      clienteSelecionado = clienteSalvo || estado.clienteSelecionado;
    } else {
      clienteSelecionado = null;
    }

    const descInput = document.getElementById('desc-input');
    if (descInput) descInput.value = estado.descInput || '';

    const notaInput = document.getElementById('nota-input');
    if (notaInput) notaInput.value = estado.notaInput || '';

    const taxaInput = document.getElementById('taxa-input');
    if (taxaInput) taxaInput.value = estado.taxaInput || '';

    const mesaInput = document.getElementById('mesa-input');
    if (mesaInput) mesaInput.value = estado.mesaAtual || '';
    mesaAtual = estado.mesaAtual || '';
    mesaPedidoAberto = estado.mesaPedidoAberto || null;

    aplicarEstadoPedidoUI();
    renderCarrinho();
    calcTotal();
    return true;
  } catch (e) {
    return false;
  }
}

window.addEventListener('beforeunload', salvarEstadoPedido);