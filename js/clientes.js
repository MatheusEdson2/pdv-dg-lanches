/* ═══════════════════════════════════════════
   CLIENTES.JS
   CRUD completo de clientes + busca de CEP automática
   + seleção de cliente na tela de Venda
═══════════════════════════════════════════ */

// Busca os clientes do banco e monta a tabela na tela
async function renderTabelaClientes() {
  clientes = await window.db.clientesListar();

  const el = document.getElementById('tbody-clientes');

  if (!clientes.length) {
    el.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--cinza);padding:30px">Nenhum cliente cadastrado</td></tr>';
    atualizarSelecionadosClientes();
    return;
  }

  el.innerHTML = clientes.map(c => `
    <tr>
      <td><input type="checkbox" class="select-cliente" data-id="${c.id}" onclick="atualizarSelecionadosClientes()"></td>
      <td><b>${c.nome}</b></td>
      <td>${c.tel || '-'}</td>
      <td style="font-size:12px;color:var(--cinza)">${c.rua ? c.rua + ', ' + c.num : '-'}</td>
      <td>${c.bairro || '-'}</td>
      <td>${c.cidade || '-'}</td>
      <td><span style="font-weight:700;color:var(--laranja)">${c.pedidos || 0}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="editarCliente(${c.id})">✏ Editar</button>
          <button class="btn-del"  onclick="deletarCliente(${c.id})">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

// Abre o modal vazio (novo) ou preenchido (editar)
function abrirModalCliente(id = null) {
  document.getElementById('modal-cliente-title').textContent = id ? 'EDITAR CLIENTE' : 'NOVO CLIENTE';

  // Limpa todos os campos
  ['id', 'nome', 'tel', 'cep', 'num', 'rua', 'bairro', 'cidade', 'comp'].forEach(f => {
    document.getElementById('cli-' + f).value = '';
  });

  // Se for edição, preenche com os dados do cliente
  if (id) {
    const c = clientes.find(x => x.id === id);
    if (c) {
      document.getElementById('cli-id').value     = c.id;
      document.getElementById('cli-nome').value   = c.nome;
      document.getElementById('cli-tel').value    = c.tel    || '';
      document.getElementById('cli-cep').value    = c.cep    || '';
      document.getElementById('cli-num').value    = c.num    || '';
      document.getElementById('cli-rua').value    = c.rua    || '';
      document.getElementById('cli-bairro').value = c.bairro || '';
      document.getElementById('cli-cidade').value = c.cidade || '';
      document.getElementById('cli-comp').value   = c.comp   || '';
    }
  }

  // Garante que fecha o modal de seleção antes de abrir o de cadastro
  fecharModal('modal-sel-cliente');
  abrirModal('modal-cliente');
}

// Atalho chamado pelo botão Editar na tabela
function editarCliente(id) {
  abrirModalCliente(id);
}

// Salva (cria ou atualiza) o cliente no banco
async function salvarCliente() {
  const id     = parseInt(document.getElementById('cli-id').value) || null;
  const nome   = document.getElementById('cli-nome').value.trim();
  const tel    = document.getElementById('cli-tel').value.trim();
  const cep    = document.getElementById('cli-cep').value.trim();
  const num    = document.getElementById('cli-num').value.trim();
  const rua    = document.getElementById('cli-rua').value.trim();
  const bairro = document.getElementById('cli-bairro').value.trim();
  const cidade = document.getElementById('cli-cidade').value.trim();
  const comp   = document.getElementById('cli-comp').value.trim();

  if (!nome) {
    toast('Informe o nome do cliente!', 'error');
    return;
  }

  try {
    await window.db.clientesSalvar({ id, nome, tel, cep, num, rua, bairro, cidade, comp });
    clientes = await window.db.clientesListar();
    fecharModal('modal-cliente');
    renderTabelaClientes();
    toast(id ? '✏ Cliente atualizado!' : '✅ Cliente cadastrado!');
  } catch (e) {
    toast('Erro ao salvar: ' + e.message, 'error');
  }
}

// Remove o cliente do banco após confirmação
async function deletarCliente(id) {
  if (!confirm('Remover este cliente?')) return;

  try {
    const res = await window.db.clientesDeletar(id);
    clientes = await window.db.clientesListar();
    renderTabelaClientes();
    if (res && res.reassigned && res.reassigned > 0) {
      toast(`🗑 Cliente removido — ${res.reassigned} pedido(s) desvinculado(s)`, 'info');
    } else {
      toast('🗑 Cliente removido', 'info');
    }
  } catch (e) {
    toast('Erro ao remover: ' + e.message, 'error');
  }
}

function atualizarSelecionadosClientes() {
  const master = document.getElementById('select-all-clientes');
  const boxes = Array.from(document.querySelectorAll('.select-cliente'));
  if (!master || !boxes.length) return;
  master.checked = boxes.every(box => box.checked);
}

function toggleSelecionarTodosClientes(source) {
  const boxes = Array.from(document.querySelectorAll('.select-cliente'));
  if (!boxes.length) return;

  const checked = source && source.checked !== undefined
    ? source.checked
    : !boxes.every(box => box.checked);

  boxes.forEach(box => box.checked = checked);
  const master = document.getElementById('select-all-clientes');
  if (master) master.checked = checked;
}

async function deletarClientesSelecionados() {
  const selecionados = Array.from(document.querySelectorAll('.select-cliente:checked')).map(cb => parseInt(cb.dataset.id));
  if (!selecionados.length) { toast('Selecione ao menos um cliente', 'info'); return; }
  if (!confirm(`Excluir ${selecionados.length} cliente(s) selecionado(s)?`)) return;

  let removidos = 0;
  let pulados = 0;
  const erros = [];
  let reassignedTotal = 0;

  for (const id of selecionados) {
    try {
      const res = await window.db.clientesDeletar(id);
      removidos++;
      if (res && res.reassigned) reassignedTotal += res.reassigned;
    } catch (e) {
      pulados++;
      erros.push(`ID ${id}: ${e.message}`);
    }
  }

  clientes = await window.db.clientesListar();
  renderTabelaClientes();

  let mensagem = `🗑 ${removidos} cliente(s) excluído(s)`;
  if (pulados) {
    mensagem += `, ${pulados} não foram removidos.`;
    toast(mensagem, 'warning');
    console.warn('Clientes não removidos:', erros.join(' | '));
  } else {
    if (reassignedTotal > 0) mensagem += ` — ${reassignedTotal} pedido(s) desvinculado(s)`;
    toast(mensagem);
  }
}

// ── SELEÇÃO DE CLIENTE NA TELA DE VENDA ──

function abrirModalSelecionarCliente() {
  document.getElementById('busca-cliente-modal').value = '';
  renderListaClientesModal();
  abrirModal('modal-sel-cliente');
}

function renderListaClientesModal() {
  const busca = document.getElementById('busca-cliente-modal').value.toLowerCase();
  const lista = document.getElementById('lista-clientes-modal');

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca) ||
    (c.tel || '').includes(busca)
  );

  if (!filtrados.length) {
    lista.innerHTML = `
      <p style="text-align:center;color:var(--cinza);padding:20px">
        Nenhum cliente encontrado.
        <a href="#" onclick="abrirModalCliente();return false" style="color:var(--laranja)">Cadastrar novo</a>
      </p>`;
    return;
  }

  lista.innerHTML = filtrados.map(c => `
    <div
      onclick="selecionarCliente(${c.id})"
      style="padding:12px 14px;background:var(--preto-borda);border-radius:10px;cursor:pointer;border:1px solid transparent;transition:all .15s;display:flex;justify-content:space-between;align-items:center"
      onmouseover="this.style.borderColor='var(--laranja)'"
      onmouseout="this.style.borderColor='transparent'"
    >
      <div>
        <div style="font-weight:700;font-size:14px">${c.nome}</div>
        <div style="font-size:12px;color:var(--cinza)">${c.tel || ''} ${c.bairro ? '· ' + c.bairro : ''}</div>
      </div>
      <span style="font-size:11px;color:var(--cinza)">${c.pedidos || 0} pedidos</span>
    </div>`).join('');
}

function selecionarCliente(id) {
  const c = clientes.find(x => x.id === id);
  if (!c) return;

  clienteSelecionado = c;
  salvarEstadoPedido();

  const el = document.getElementById('cliente-select-display');
  el.textContent = c.nome;
  el.classList.add('selected');

  fecharModal('modal-sel-cliente');
  toast(`👤 ${c.nome} selecionado`, 'info');
}

// ── BUSCA DE CEP AUTOMÁTICA (ViaCEP) ──

async function buscarCEP(cep) {
  const s = cep.replace(/\D/g, '');
  if (s.length !== 8) return;

  try {
    const r = await fetch(`https://viacep.com.br/ws/${s}/json/`);
    const d = await r.json();
    if (!d.erro) {
      document.getElementById('cli-rua').value    = d.logradouro || '';
      document.getElementById('cli-bairro').value = d.bairro     || '';
      document.getElementById('cli-cidade').value = d.localidade || '';
      toast('📍 Endereço encontrado!', 'info');
    }
  } catch (e) {
    // CEP não encontrado — sem aviso, usuário preenche manual
  }
}