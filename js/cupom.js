/* ═══════════════════════════════════════════
   CUPOM.JS
   Gera o cupom em texto e aciona a impressão
═══════════════════════════════════════════ */

function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if ((current + ' ' + word).length <= maxWidth) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function gerarCupomModal(p) {
  const COLS = 48;
  const linha = '='.repeat(COLS);
  const centro = t => {
    const s = t.length > COLS ? t.substring(0, COLS) : t;
    return ' '.repeat(Math.max(0, Math.floor((COLS - s.length) / 2))) + s;
  };

  let txt = '';
  txt += centro('DG LANCHES') + '\n';
  txt += centro('Sabor que reune.') + '\n';
  txt += centro('(32) 9 9933-1514') + '\n';
  txt += centro('@dglanches_br') + '\n';
  txt += linha + '\n';
  txt += `Data/Hora: ${p.data} ${p.hora}\n`;
  txt += `Cliente: ${p.cliente}\n`;
  if (p.mesa) txt += `Mesa/Comanda: ${p.mesa}\n`;
  txt += `Tipo: ${p.tipo.toUpperCase()}\n`;

  // Endereço do cliente (só no delivery) com quebra de linha
  if (p.tipo === 'delivery' && p.endereco) {
    txt += linha + '\n';
    txt += 'ENDERECO DE ENTREGA:\n';
    wrapText(p.endereco, COLS).forEach(line => {
      txt += line + '\n';
    });
  }

  txt += linha + '\n';
  const nameWidth = 30;
  const qtyWidth = 3;
  const valWidth = 10;
  const labelPad = nameWidth + 1 + qtyWidth;

  txt += `${'ITEM'.padEnd(nameWidth)} ${'QTD'.padStart(qtyWidth)} ${'VALOR'.padStart(valWidth)}\n`;
  txt += linha + '\n';

  p.itens.forEach(i => {
    const nome = i.nome.substring(0, nameWidth).padEnd(nameWidth);
    const qty  = String(i.qty).padStart(qtyWidth);
    const val  = fmt(i.preco * i.qty).padStart(valWidth);
    txt += `${nome} ${qty} ${val}\n`;
  });

  txt += linha + '\n';
  txt += `${'SUBTOTAL:'.padEnd(labelPad)} ${fmt(p.subtotal).padStart(valWidth)}\n`;

  if (p.tipo === 'delivery' && p.taxaEntrega > 0) {
    txt += `${'TAXA DE ENTREGA:'.padEnd(labelPad)} ${fmt(p.taxaEntrega).padStart(valWidth)}\n`;
  }

  if (p.desconto > 0) {
    txt += `${'DESCONTO:'.padEnd(labelPad)} ${('-' + p.desconto.toFixed(2).replace('.',',') + '%').padStart(valWidth)}\n`;
  }

  txt += `${'TOTAL:'.padEnd(labelPad)} ${fmt(p.total).padStart(valWidth)}\n`;
  txt += `${'PAGAMENTO:'.padEnd(labelPad)} ${p.pgto.toUpperCase().padStart(valWidth)}\n`;
  txt += linha + '\n';
  txt += centro('Obrigado pela preferencia!') + '\n';
  txt += centro('Volte sempre, voce faz parte') + '\n';
  txt += centro('da nossa familia!') + '\n';

  document.getElementById('cupom-preview').textContent = txt;

  // Guarda o texto e o ID do pedido para usar nos botões
  window._cupomTxt      = txt;
  window._cupomPedidoId = p.id || null;
  window._cupomPedido   = p;

  abrirModal('modal-cupom');
}

function gerarComandaMesa() {
  if (!carrinho.length) {
    toast('Adicione itens para gerar a nota da mesa!', 'error');
    return;
  }
  const sub = calcularSubtotalPedido(carrinho);
  const desc = toNumber(document.getElementById('desc-input')?.value, 0);
  const taxa = tipoEntrega === 'delivery'
    ? toNumber(document.getElementById('taxa-input')?.value, 0)
    : 0;
  const total = calcularTotalPedido({ itens: carrinho, descontoPercent: desc, taxaEntrega: taxa });
  const now = new Date();
  const pedidoPreview = {
    id: null,
    cliente: clienteSelecionado ? clienteSelecionado.nome : 'Balcão',
    mesa: mesaAtual || '',
    itens: carrinho.map(i => ({ ...i })),
    subtotal: sub,
    desconto: desc,
    taxaEntrega: taxa,
    total,
    tipo: tipoEntrega,
    pgto: formaPgto,
    hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    data: now.toLocaleDateString('pt-BR'),
    endereco: clienteSelecionado && tipoEntrega === 'delivery'
      ? [clienteSelecionado.rua, clienteSelecionado.num, clienteSelecionado.bairro, clienteSelecionado.cidade].filter(Boolean).join(', ')
      : '',
  };
  gerarCupomModal(pedidoPreview);
  window._cupomPedidoId = null; // sem pedido salvo, desabilita cancelamento
}

function imprimirCupom() {
  const p = window._cupomPedido;
  if (!p) return;

  const hr = `<div style="border-top:1px dashed #000;margin:5px 0"></div>`;
  const row = (label, value, bold) => {
    const s = bold ? 'font-weight:900;font-size:15px' : '';
    return `<div style="display:flex;justify-content:space-between;${s}"><span>${label}</span><span>${value}</span></div>`;
  };

  const itens = (p.itens || []).map(i => {
    const qty  = i.qty  || i.quantidade  || 0;
    const preco = i.preco || i.preco_unitario || 0;
    return `
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px">
        <span style="flex:1;padding-right:4px">${i.nome}</span>
        <span style="width:28px;text-align:center">${qty}</span>
        <span style="width:56px;text-align:right">${fmt(preco * qty)}</span>
      </div>`;
  }).join('');

  const mesa   = p.mesa   ? `<div style="font-size:13px">Mesa/Comanda: <b>${p.mesa}</b></div>` : '';
  const endereco = (p.tipo === 'delivery' && p.endereco)
    ? `${hr}<div style="font-size:13px;font-weight:bold">ENDEREÇO:</div><div style="font-size:13px">${p.endereco}</div>` : '';
  const desconto = (p.desconto > 0)
    ? row('Desconto:', `-${Number(p.desconto).toFixed(2).replace('.',',')}%`) : '';
  const taxa = (p.tipo === 'delivery' && p.taxaEntrega > 0)
    ? row('Taxa entrega:', fmt(p.taxaEntrega)) : '';

  const html = `
    <div style="width:72mm;font-family:'Courier New',Courier,monospace;font-size:14px;color:#000;background:#fff;padding:4mm 2mm">

      <div style="text-align:center;margin-bottom:6px">
        <div style="font-size:22px;font-weight:900;letter-spacing:3px;line-height:1.2">DG LANCHES</div>
        <div style="font-size:13px">Sabor que reune.</div>
        <div style="font-size:13px">(32) 9 9933-1514</div>
        <div style="font-size:13px">@dglanches_br</div>
      </div>

      ${hr}
      <div style="font-size:13px">Data/Hora: <b>${p.data} ${p.hora}</b></div>
      <div style="font-size:13px">Pedido: <b>#${String(p.seq || '').padStart(3,'0')}</b></div>
      <div style="font-size:13px">Cliente: <b>${p.cliente}</b></div>
      ${mesa}
      <div style="font-size:13px">Tipo: <b>${(p.tipo||'').toUpperCase()}</b></div>
      ${endereco}

      ${hr}
      <div style="display:flex;justify-content:space-between;font-weight:900;font-size:13px;margin-bottom:3px">
        <span style="flex:1">ITEM</span><span style="width:28px;text-align:center">QTD</span><span style="width:56px;text-align:right">VALOR</span>
      </div>
      ${hr}
      ${itens}
      ${hr}

      ${row('Subtotal:', fmt(p.subtotal || p.total))}
      ${taxa}
      ${desconto}
      <div style="display:flex;justify-content:space-between;font-weight:900;font-size:17px;margin:4px 0">
        <span>TOTAL:</span><span>${fmt(p.total)}</span>
      </div>
      ${row('Pagamento:', (p.pgto||'').toUpperCase(), true)}

      ${hr}
      <div style="text-align:center;font-size:11px;margin-top:4px">
        <div style="font-size:12px">Obrigado pela preferencia!</div>
        <div style="font-size:12px">Volte sempre, voce faz parte</div>
        <div style="font-size:12px">da nossa familia!</div>
      </div>
    </div>`;

  const cupomPrint = document.getElementById('cupom-print');
  cupomPrint.innerHTML = html;
  cupomPrint.style.display = 'block';
  window.print();
  setTimeout(() => {
    cupomPrint.style.display = 'none';
    cupomPrint.innerHTML = '';
  }, 1000);
}

async function cancelarPedido() {
  const pedidoId = window._cupomPedidoId;

  if (!pedidoId) {
    toast('Nenhum pedido para cancelar', 'error');
    return;
  }

  if (!confirm(
    'Cancelar e EXCLUIR o pedido #' + String(pedidoId).padStart(3,'0') + ' do banco de dados?\n\n' +
    'Essa ação não pode ser desfeita.'
  )) return;

  try {
    await window.db.pedidoCancelar(pedidoId);
    window._cupomPedidoId = null;
    fecharModal('modal-cupom');

    if (typeof renderTabelaPedidos === 'function') renderTabelaPedidos();
    if (typeof renderCaixa === 'function') renderCaixa();
    if (typeof atualizarNumPedidoAtual === 'function') atualizarNumPedidoAtual();

    toast('🚫 Pedido #' + pedidoId + ' excluído!', 'info');
  } catch(e) {
    toast('Erro ao cancelar: ' + e.message, 'error');
  }
}