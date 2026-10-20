/* ═══════════════════════════════════════════
   CARRINHO.JS
   Adicionar/remover itens, calcular totais, troco e taxa de entrega
═══════════════════════════════════════════ */

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function calcularSubtotalPedido(itens = carrinho) {
  return (itens || []).reduce((total, item) => {
    const qty = Math.max(1, parseInt(item.qty || item.quantidade || 1, 10) || 1);
    const preco = toNumber(item.preco || item.preco_unitario, 0);
    return total + (preco * qty);
  }, 0);
}

function calcularTotalPedido({ itens = carrinho, descontoPercent = 0, taxaEntrega = 0 } = {}) {
  const subtotal = calcularSubtotalPedido(itens);
  const desconto = toNumber(descontoPercent, 0);
  const taxa = toNumber(taxaEntrega, 0);
  const descontoValor = subtotal * desconto / 100;
  return Math.max(0, subtotal - descontoValor + taxa);
}

function getValoresPedidoAtual() {
  const subtotal = calcularSubtotalPedido(carrinho);
  const descInput = document.getElementById('desc-input');
  const taxaInput = document.getElementById('taxa-input');
  const descontoPercent = toNumber(descInput?.value, 0);
  const taxaEntrega = tipoEntrega === 'delivery' ? toNumber(taxaInput?.value, 0) : 0;
  const total = calcularTotalPedido({ itens: carrinho, descontoPercent, taxaEntrega });

  return { subtotal, descontoPercent, taxaEntrega, total };
}

function addAoCarrinho(id) {
  const numericId = Number(id);
  const prod = produtos.find(p => Number(p.id) === numericId);
  if (!prod || Number(prod.status) !== 1) return;

  const item = carrinho.find(i => Number(i.id) === numericId);
  if (item) {
    item.qty = (toNumber(item.qty, 0) || 0) + 1;
  } else {
    carrinho.push({ id: numericId, nome: prod.nome, preco: toNumber(prod.preco, 0), qty: 1 });
  }
  renderCarrinho();
  salvarEstadoPedido();
  
  // Se estamos no balcão, salva/atualiza pedido aberto automaticamente
  if (tipoEntrega === 'balcao' && typeof sincronizarComBanco === 'function') {
    sincronizarComBanco().catch(e => console.error('Erro ao sincronizar:', e));
  }
}

function alterarQty(id, delta) {
  const numericId = Number(id);
  const item = carrinho.find(i => Number(i.id) === numericId);
  if (!item) return;

  item.qty = Math.max(0, toNumber(item.qty, 1) + delta);
  if (item.qty <= 0) {
    carrinho = carrinho.filter(i => Number(i.id) !== numericId);
  }
  renderCarrinho();
  salvarEstadoPedido();
  
  // Sincroniza mudanças com banco
  if (tipoEntrega === 'balcao' && typeof sincronizarComBanco === 'function') {
    sincronizarComBanco().catch(e => console.error('Erro ao sincronizar:', e));
  }
}

function removerItemCarrinho(id) {
  const numericId = Number(id);
  carrinho = carrinho.filter(i => Number(i.id) !== numericId);
  renderCarrinho();
  salvarEstadoPedido();
}

function renderCarrinho() {
  const lista = document.getElementById('itens-lista');
  if (!lista) return;

  if (!carrinho.length) {
    lista.innerHTML = '<div class="empty-cart"><span>🛒</span><p>Nenhum item ainda<br>Clique em um produto para adicionar</p></div>';
    calcTotal();
    if (typeof sincronizarMesaAtiva === 'function') sincronizarMesaAtiva();
    return;
  }

  lista.innerHTML = carrinho.map(item => `
    <div class="item-pedido">
      <div class="item-info">
        <div class="item-nome">${item.nome}</div>
      </div>
      <div class="item-controles">
        <button class="remove-btn" onclick="removerItemCarrinho(${item.id})">✖</button>
        <button class="qty-btn" onclick="alterarQty(${item.id}, -1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="alterarQty(${item.id}, 1)">+</button>
      </div>
      <span class="item-preco">${fmt(toNumber(item.preco, 0) * toNumber(item.qty, 1))}</span>
    </div>
  `).join('');

  calcTotal();
  if (typeof sincronizarMesaAtiva === 'function') sincronizarMesaAtiva();
}

function calcTotal() {
  const { subtotal, descontoPercent, taxaEntrega, total } = getValoresPedidoAtual();
  const subtotalEl = document.getElementById('subtotal-txt');
  const descontoEl = document.getElementById('desconto-txt');
  const totalEl = document.getElementById('total-txt');

  if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
  if (descontoEl) descontoEl.textContent = '- ' + descontoPercent.toFixed(2).replace('.', ',') + '%';
  if (totalEl) totalEl.textContent = fmt(total);

  // Linha de taxa de entrega
  const taxaRow = document.getElementById('taxa-row');
  const taxaTxt = document.getElementById('taxa-txt');
  if (taxaRow && taxaTxt) {
    taxaRow.style.display = tipoEntrega === 'delivery' ? 'flex' : 'none';
    taxaTxt.textContent = fmt(taxaEntrega);
  }

  // Troco (só no dinheiro)
  const notaEl = document.getElementById('nota-input');
  const trocoEl = document.getElementById('troco-row');
  const trocoTxt = document.getElementById('troco-txt');
  if (formaPgto === 'dinheiro' && notaEl && trocoEl && trocoTxt) {
    const nota = toNumber(notaEl.value, 0);
    const troco = nota - total;
    if (nota > 0) {
      trocoEl.style.display = 'flex';
      trocoTxt.textContent = fmt(Math.max(0, troco));
      trocoTxt.style.color = troco >= 0 ? 'var(--verde)' : 'var(--vermelho)';
    } else {
      trocoEl.style.display = 'none';
    }
  } else if (trocoEl) {
    trocoEl.style.display = 'none';
  }

  salvarEstadoPedido();
}

function cancelarPedido() {
  if (!carrinho.length) {
    toast('Não há pedido em andamento para cancelar.', 'info');
    return;
  }

  const confirmar = confirm('Cancelar o pedido em andamento? Todos os itens serão removidos.');
  if (!confirmar) return;

  limparPedido();
  toast('Pedido cancelado.');
}

function limparPedido() {
  // Limpa o snap do tipo que acabou de ser finalizado
  if (tipoEntrega === 'retirada') snapRetirada = null;
  if (tipoEntrega === 'delivery') snapDelivery = null;

  // Remove a mesa ativa do registro de mesas abertas (pedido finalizado)
  if (mesaAtivaKey && mesasAbertas) {
    delete mesasAbertas[mesaAtivaKey];
    if (typeof salvarMesasStorage === 'function') salvarMesasStorage();
  }
  mesaAtivaKey = null;

  _limparCarrinhoLocal();
  tipoEntrega = 'balcao';
  document.querySelectorAll('.tipo-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  if (typeof renderMesasPanel === 'function') renderMesasPanel();
}

function setTipo(t, btn) {
  const tipoAnterior = tipoEntrega;

  // Já está nesse tipo — só atualiza o botão visual
  if (tipoAnterior === t) {
    document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    return;
  }

  // 1. SALVA estado do tipo anterior (antes de mudar tipoEntrega)
  if (tipoAnterior === 'balcao') {
    const snapKey = mesaAtivaKey || mesaAtual || 'Balcão';
    if (!mesaAtivaKey && carrinho.length > 0) mesaAtivaKey = snapKey;
    if (mesaAtivaKey && typeof capturarSnapshotMesa === 'function') {
      mesasAbertas[mesaAtivaKey] = capturarSnapshotMesa();
      salvarMesasStorage();
    }
  } else if (tipoAnterior === 'retirada') {
    snapRetirada = carrinho.length > 0 ? _capturarSnapSimples() : null;
  } else if (tipoAnterior === 'delivery') {
    snapDelivery = carrinho.length > 0 ? _capturarSnapSimples() : null;
  }

  // 2. MUDA tipo e botão
  tipoEntrega = t;
  document.querySelectorAll('.tipo-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // 3. LIMPA carrinho (mesaAtivaKey zerado para não sobrescrever snapshot)
  const savedMesaKey = mesaAtivaKey;
  mesaAtivaKey = null;
  _limparCarrinhoLocal();
  // não restaura mesaAtivaKey aqui — cada ramo abaixo cuida disso

  // 4. RESTAURA estado do novo tipo
  if (t === 'balcao') {
    const keyToRestore = savedMesaKey || Object.keys(mesasAbertas || {})[0];
    if (keyToRestore && mesasAbertas && mesasAbertas[keyToRestore] && typeof restaurarSnapshotMesa === 'function') {
      mesaAtivaKey = keyToRestore;
      restaurarSnapshotMesa(mesasAbertas[keyToRestore]);
    }
    // else: carrinho vazio, mesaAtivaKey fica null
  } else if (t === 'retirada' && snapRetirada) {
    _restaurarSnapSimples(snapRetirada);
  } else if (t === 'delivery' && snapDelivery) {
    _restaurarSnapSimples(snapDelivery);
  }

  // 5. UI
  if (typeof renderMesasPanel === 'function') renderMesasPanel();
  const taxaEntregaRow = document.getElementById('taxa-entrega-row');
  if (taxaEntregaRow) taxaEntregaRow.style.display = t === 'delivery' ? 'flex' : 'none';
  const mesaRow = document.getElementById('mesa-row');
  if (mesaRow) mesaRow.style.display = 'none';

  calcTotal();
  salvarEstadoPedido();
}

// Captura snapshot simples do carrinho para retirada/delivery
function _capturarSnapSimples() {
  return {
    carrinho: [...carrinho],
    clienteSelecionado: clienteSelecionado ? { ...clienteSelecionado } : null,
    formaPgto,
    descInput: document.getElementById('desc-input')?.value || '',
    notaInput: document.getElementById('nota-input')?.value || '',
    taxaInput: document.getElementById('taxa-input')?.value || '',
  };
}

// Restaura snapshot simples para retirada/delivery
function _restaurarSnapSimples(snap) {
  if (!snap) return;
  carrinho = Array.isArray(snap.carrinho) ? [...snap.carrinho] : [];
  clienteSelecionado = snap.clienteSelecionado || null;
  formaPgto = snap.formaPgto || 'dinheiro';
  mesaAtual = '';
  mesaPedidoAberto = null;

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
  const descInput = document.getElementById('desc-input');
  if (descInput) descInput.value = snap.descInput || '';
  const notaInput = document.getElementById('nota-input');
  if (notaInput) notaInput.value = snap.notaInput || '';
  const taxaInput = document.getElementById('taxa-input');
  if (taxaInput) taxaInput.value = snap.taxaInput || '';

  document.querySelectorAll('.pgto-btn').forEach(btn => {
    const p = btn.getAttribute('onclick')?.match(/'(\w+)'/)?.[1] || 'dinheiro';
    btn.classList.toggle('active', p === formaPgto);
  });

  renderCarrinho();
  calcTotal();
}

// Helper interno: limpa apenas os dados do carrinho local sem afetar mesasAbertas
function _limparCarrinhoLocal() {
  carrinho = [];
  clienteSelecionado = null;
  mesaPedidoAberto = null;
  mesaAtual = '';
  formaPgto = 'dinheiro';
  const mesaInput = document.getElementById('mesa-input');
  if (mesaInput) mesaInput.value = '';
  const descInput = document.getElementById('desc-input');
  if (descInput) descInput.value = '';
  const display = document.getElementById('cliente-select-display');
  if (display) { display.textContent = 'Sem cliente / Balcão'; display.classList.remove('selected'); }
  document.querySelectorAll('.pgto-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  limparEstadoPedidoStorage();
  renderCarrinho();
}

function setPgto(p, btn) {
  formaPgto = p;
  document.querySelectorAll('.pgto-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const notaRow = document.getElementById('nota-row');
  const trocoRow = document.getElementById('troco-row');
  const notaInput = document.getElementById('nota-input');

  if (p === 'dinheiro') {
    if (notaRow) notaRow.style.display = 'flex';
  } else {
    if (notaRow) notaRow.style.display = 'none';
    if (trocoRow) trocoRow.style.display = 'none';
    if (notaInput) notaInput.value = '';
  }

  calcTotal();
  salvarEstadoPedido();
}