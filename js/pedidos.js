/* ═══════════════════════════════════════════
   PEDIDOS.JS
   Finalizar pedido e listar/exportar pedidos
═══════════════════════════════════════════ */

async function atualizarNumPedidoAtual() {
  const pedidosHoje = await window.db.pedidosHoje();
  numPedidoAtual = pedidosHoje.length + 1;
  const label = document.getElementById('num-pedido');
  if (label) label.textContent = '#' + String(numPedidoAtual).padStart(3, '0');
}

// Sincroniza estado do carrinho com o banco de dados
async function sincronizarComBanco() {
  // Lê mesa atual do campo de entrada
  mesaAtual = document.getElementById('mesa-input')?.value?.trim() || '';
  
  if (!mesaAtual) return; // não sincroniza sem nome da mesa
  
  if (mesaPedidoAberto) {
    // Já existe pedido aberto - atualiza
    await atualizarPedidoAberto();
  } else if (carrinho.length) {
    // Primeiro item - cria novo pedido aberto
    await salvarPedidoAberto();
  }
}

// Salva um novo pedido em status 'aberto' para a mesa/comanda
async function salvarPedidoAberto() {
  if (tipoEntrega !== 'balcao' || mesaPedidoAberto || !carrinho.length) return;
  
  mesaAtual = document.getElementById('mesa-input')?.value?.trim() || '';
  if (!mesaAtual) return;
  
  const sub = calcularSubtotalPedido(carrinho);
  const desc = toNumber(document.getElementById('desc-input')?.value, 0);
  const now = new Date();
  
  const pedido = {
    cliente: clienteSelecionado?.nome || 'Balcão',
    cliente_id: clienteSelecionado?.id || null,
    total: calcularTotalPedido({ itens: carrinho, descontoPercent: desc, taxaEntrega: 0 }),
    subtotal: sub,
    desconto: desc,
    taxa_entrega: 0,
    tipo: 'balcao',
    pgto: formaPgto,
    status: 'aberto',
    mesa: mesaAtual,
    hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    data: now.toLocaleDateString('pt-BR'),
    itens: carrinho,
  };
  
  try {
    const resultado = await window.db.salvarPedidoAberto(pedido);
    // Extrai o ID do resultado - pode ser {ok, id} ou apenas número
    mesaPedidoAberto = Number(resultado.id || resultado);
    console.log('✅ Comanda #' + mesaAtual + ' salva (ID: ' + mesaPedidoAberto + ')');
    salvarEstadoPedido();
  } catch (e) {
    console.error('❌ Erro ao salvar pedido aberto:', e);
    throw e;
  }
}

// Carrega um pedido aberto previamente para continuar adicionando itens
async function carregarPedidoAberto(pedidoId) {
  const todosAbertos = await window.db.pedidosAbertos();
  const pedidoCarregar = todosAbertos.find(p => p.id === pedidoId);
  
  if (!pedidoCarregar) {
    toast('Pedido não encontrado ou já foi finalizado', 'error');
    return;
  }
  
  // Restaura estado do pedido
  mesaAtual = pedidoCarregar.mesa || '';
  mesaPedidoAberto = pedidoCarregar.id;
  formaPgto = pedidoCarregar.pgto || 'dinheiro';
  clienteSelecionado = null;
  if (pedidoCarregar.cliente_id) {
    clienteSelecionado = clientes.find(c => c.id === pedidoCarregar.cliente_id) || {
      id: pedidoCarregar.cliente_id,
      nome: pedidoCarregar.cliente
    };
  }
  
  // Restaura itens
  carrinho = (pedidoCarregar.itens || []).map(i => ({
    id: i.produto_id,
    nome: i.nome,
    preco: i.preco_unitario,
    qty: i.quantidade
  }));
  
  // Atualiza UI
  const mesaInput = document.getElementById('mesa-input');
  if (mesaInput) mesaInput.value = mesaAtual;
  
  const formaPgtoSelect = document.getElementById('forma-pgto');
  if (formaPgtoSelect) formaPgtoSelect.value = formaPgto;
  
  salvarEstadoPedido();
  renderCarrinho();
  calcTotal();
  
  toast(`Pedido #${pedidoId} (${mesaAtual}) carregado`, 'success');
}

// Atualiza um pedido aberto com itens e valores atualizados
async function atualizarPedidoAberto() {
  if (!mesaPedidoAberto) return;
  
  const sub = calcularSubtotalPedido(carrinho);
  const desc = toNumber(document.getElementById('desc-input')?.value, 0);
  
  try {
    await window.db.atualizarPedidoAberto({
      id: mesaPedidoAberto,
      total: calcularTotalPedido({ itens: carrinho, descontoPercent: desc, taxaEntrega: 0 }),
      subtotal: sub,
      desconto: desc,
      itens: carrinho,
      pgto: formaPgto,
    });
    console.log('🔄 Comanda #' + mesaAtual + ' sincronizada');
  } catch (e) {
    console.error('❌ Erro ao atualizar pedido aberto:', e);
  }
}

// Marca um pedido aberto como pago
async function finalizarPedidoAberto(pedidoId) {
  if (!pedidoId) return;
  
  try {
    await window.db.finalizarPedidoAberto(pedidoId);
    console.log('✅ Pedido #' + pedidoId + ' finalizado');
  } catch (e) {
    console.error('❌ Erro ao finalizar pedido aberto:', e);
  }
}

async function finalizarPedido() {
  if (!carrinho.length) {
    toast('Adicione pelo menos um item!', 'error');
    return;
  }

  // Se estamos no balcão com um pedido aberto, finaliza esse pedido
  if (tipoEntrega === 'balcao' && mesaPedidoAberto) {
    try {
      const sub   = calcularSubtotalPedido(carrinho);
      const desc  = toNumber(document.getElementById('desc-input')?.value, 0);
      const total = calcularTotalPedido({ itens: carrinho, descontoPercent: desc, taxaEntrega: 0 });
      const now   = new Date();

      // Atualiza valores finais no banco
      await window.db.atualizarPedidoAberto({
        id: mesaPedidoAberto,
        total,
        subtotal: sub,
        desconto: desc,
        itens: carrinho,
        pgto: formaPgto,
      });

      // Monta objeto do cupom ANTES de marcar como pago (formato idêntico ao fluxo normal)
      const pedidoParaCupom = {
        id:          mesaPedidoAberto,
        cliente:     clienteSelecionado?.nome || 'Balcão',
        mesa:        mesaAtual || '',
        tipo:        'balcao',
        itens:       [...carrinho],
        subtotal:    sub,
        desconto:    desc,
        taxaEntrega: 0,
        total,
        pgto:        formaPgto,
        hora:        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        data:        now.toLocaleDateString('pt-BR'),
      };

      // Marca como pago
      await window.db.finalizarPedidoAberto(mesaPedidoAberto);

      // Busca seq correto e atualiza contador de pedidos
      await atualizarNumPedidoAtual();
      const pedidosHoje = await window.db.pedidosHoje();
      const pedidoHoje  = pedidosHoje.find(p => p.id === mesaPedidoAberto);
      if (pedidoHoje) pedidoParaCupom.seq = pedidoHoje.seq;

      await renderTabelaPedidos();

      // Mostra cupom igual ao fluxo normal
      gerarCupomModal(pedidoParaCupom);

      // Fecha mesa e limpa carrinho
      mesaPedidoAberto = null;
      if (typeof fecharMesaAtiva === 'function') {
        fecharMesaAtiva();
      } else {
        limparPedido();
      }

      toast('✅ Pedido finalizado!');
      return;
    } catch (e) {
      toast('Erro ao finalizar pedido: ' + e.message, 'error');
      return;
    }
  }

  const sub  = calcularSubtotalPedido(carrinho);
  const desc = toNumber(document.getElementById('desc-input')?.value, 0);
  const taxa = tipoEntrega === 'delivery'
    ? toNumber(document.getElementById('taxa-input')?.value, 0)
    : 0;
  const total = calcularTotalPedido({ itens: carrinho, descontoPercent: desc, taxaEntrega: taxa });
  const now   = new Date();

  // Monta endereço do cliente para o cupom (só no delivery)
  let endereco = '';
  if (tipoEntrega === 'delivery' && clienteSelecionado) {
    const c = clienteSelecionado;
    const partes = [c.rua, c.num, c.bairro, c.cidade, c.comp].filter(Boolean);
    endereco = partes.join(', ');
  }

  const pedido = {
    clienteId:   clienteSelecionado ? clienteSelecionado.id : null,
    cliente:     clienteSelecionado ? clienteSelecionado.nome : 'Balcão',
    itens:       [...carrinho],
    subtotal:    sub,
    desconto:    desc,
    taxaEntrega: taxa,
    total,
    tipo:        tipoEntrega,
    pgto:        formaPgto,
    status:      'pago',
    hora:        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    data:        now.toLocaleDateString('pt-BR'),
    mesa:        mesaAtual || '',
    caixaAberto: 1,
    endereco,
    pedidoAbertoId: mesaPedidoAberto || null,  // se for continua\u00e7\u00e3o de pedido aberto
  };

  try {
    const r = await window.db.pedidosSalvar(pedido);
    pedido.id = r.id;

    const pedidosHoje = await window.db.pedidosHoje();
    const salvo = pedidosHoje.find(x => x.id === r.id);
    if (salvo) pedido.seq = salvo.seq;

    await atualizarNumPedidoAtual();

    gerarCupomModal(pedido);

    // Fecha a comanda da mesa (ou limpa o carrinho se não for balcão)
    if (typeof fecharMesaAtiva === 'function' && tipoEntrega === 'balcao') {
      fecharMesaAtiva();
    } else {
      limparPedido();
    }

    toast('✅ Pedido salvo no banco!');
  } catch (e) {
    toast('Erro ao salvar pedido: ' + e.message, 'error');
  }
}

async function renderTabelaPedidos() {
  const pedidos = await window.db.pedidosHoje();
  const el = document.getElementById('tbody-pedidos');

  if (!pedidos.length) {
    el.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--cinza);padding:30px">Nenhum pedido registrado</td></tr>';
    atualizarSelecionadosPedidos();
  } else {
    const tipoIcon = { balcao: '🏪', retirada: '🛍', delivery: '🛵' };
    const pgtoIcon = { dinheiro: '💵', pix: '📱', debito: '💳', credito: '💳' };
    const pedidosDisplay = [...pedidos].reverse();

    el.innerHTML = pedidosDisplay.map(p => `
      <tr>
        <td><input type="checkbox" class="select-pedido" data-id="${p.id}" onclick="atualizarSelecionadosPedidos()"></td>
        <td><b>#${String(p.seq).padStart(3, '0')}</b></td>
        <td>${p.cliente}${p.mesa ? `<div style="font-size:11px;color:var(--laranja)">Mesa: ${p.mesa}</div>` : ''}</td>
        <td style="font-size:12px;color:var(--cinza)">
          ${(p.itens || []).map(i => i.quantidade + 'x ' + i.nome.split(' ').slice(0, 3).join(' ')).join(', ')}
        </td>
        <td>${tipoIcon[p.tipo] || ''} ${p.tipo}</td>
        <td>${pgtoIcon[p.pgto] || ''} ${p.pgto}</td>
        <td class="preco-col">${fmt(p.total)}</td>
        <td><span class="status-pill ${p.status === 'pago' ? 'status-on' : 'status-off'}">${p.status}</span></td>
        <td>${p.hora}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn-edit" onclick="reimprimirPedido(${p.id})">🖨 Reimprimir</button>
          <button class="btn-del" onclick="deletarPedido(${p.id}, ${p.seq})">🗑 Excluir</button>
        </td>
      </tr>`).join('');
    atualizarSelecionadosPedidos();
  }
  
  // Renderiza pedidos abertos
  await renderPedidosAbertos();
}

async function renderPedidosAbertos() {
  const abertos = await window.db.pedidosAbertos();
  const container = document.getElementById('pedidos-abertos-container');
  const lista = document.getElementById('pedidos-abertos-lista');
  
  if (!abertos || !abertos.length) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'block';
  lista.innerHTML = abertos.map(p => {
    const itensCont = (p.itens || []).length;
    const totalPedido = fmt(p.total);
    return `<button class="btn-primary" onclick="carregarPedidoAberto(${p.id})" style="flex:0 0 auto;padding:8px 12px;font-size:13px">
      <div style="margin-bottom:2px">Mesa: <b>${p.mesa}</b></div>
      <div style="font-size:11px;color:#666">${itensCont} itens • ${totalPedido}</div>
    </button>`;
  }).join('');
}

function atualizarSelecionadosPedidos() {
  const master = document.getElementById('select-all-pedidos');
  const boxes = Array.from(document.querySelectorAll('.select-pedido'));
  if (!master) return;
  master.checked = boxes.length > 0 && boxes.every(box => box.checked);
}

function toggleSelecionarTodosPedidos(source) {
  const boxes = Array.from(document.querySelectorAll('.select-pedido'));
  if (!boxes.length) return;

  const checked = source && source.checked !== undefined
    ? source.checked
    : !boxes.every(box => box.checked);

  boxes.forEach(box => box.checked = checked);
  const master = document.getElementById('select-all-pedidos');
  if (master) master.checked = checked;
}

async function deletarPedidosSelecionados() {
  const selecionados = Array.from(document.querySelectorAll('.select-pedido:checked')).map(cb => parseInt(cb.dataset.id));
  if (!selecionados.length) { toast('Selecione ao menos um pedido', 'info'); return; }
  if (!confirm(`Excluir ${selecionados.length} pedido(s) selecionado(s)?`)) return;

  for (const id of selecionados) {
    await window.db.pedidoCancelar(id);
  }

  await renderTabelaPedidos();
  await atualizarNumPedidoAtual();
  toast(`🗑 ${selecionados.length} pedido(s) excluído(s)`);
}

async function deletarPedido(id, seq) {
  if (!confirm('Excluir pedido #' + String(seq).padStart(3, '0') + '?')) return;

  try {
    await window.db.pedidoCancelar(id);
    await renderTabelaPedidos();
    await atualizarNumPedidoAtual();
    toast('🗑 Pedido excluído com sucesso!');
  } catch (e) {
    toast('Erro ao excluir pedido: ' + e.message, 'error');
  }
}

async function reimprimirPedido(id) {
  let pedidos = await window.db.pedidosHoje();
  let p = pedidos.find(x => x.id === id);

  if (!p) {
    pedidos = await window.db.pedidosListar();
    p = pedidos.find(x => x.id === id);
  }

  if (!p) return;
  p.itens = (p.itens || []).map(i => ({ ...i, qty: i.quantidade, preco: i.preco_unitario }));
  gerarCupomModal(p);
}
