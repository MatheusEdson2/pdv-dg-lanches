/* ═══════════════════════════════════════════
   CAIXA.JS
   Resumo financeiro do dia, fechamento e exportação Excel
═══════════════════════════════════════════ */

async function renderCaixa({ data } = {}) {
  const estado = await window.db.caixaEstado();
  const diaMostrado = data || estado?.ultimaData || new Date().toLocaleDateString('pt-BR');
  const [doDia, todosClientes] = await Promise.all([
    window.db.pedidosCaixaHoje(diaMostrado),
    window.db.clientesListar(),
  ]);

  const totalDia = doDia.reduce((a, p) => a + p.total, 0);
  const ticketMedio = doDia.length ? totalDia / doDia.length : 0;

  const pgtos = {};
  doDia.forEach(p => {
    if (!pgtos[p.pgto]) pgtos[p.pgto] = { qty: 0, total: 0 };
    pgtos[p.pgto].qty++;
    pgtos[p.pgto].total += p.total;
  });

  const icons = { dinheiro: '💵', pix: '📱', debito: '💳', credito: '💳' };
  const hoje = diaMostrado;

  document.getElementById('caixa-resumo').innerHTML = `
    <div class="caixa-card">
      <div class="caixa-card-label">Total do Dia</div>
      <div class="caixa-card-valor laranja">${fmt(totalDia)}</div>
    </div>
    <div class="caixa-card">
      <div class="caixa-card-label">Pedidos Realizados</div>
      <div class="caixa-card-valor">${doDia.length}</div>
    </div>
    <div class="caixa-card">
      <div class="caixa-card-label">Ticket Médio</div>
      <div class="caixa-card-valor verde">${fmt(ticketMedio)}</div>
    </div>
    <div class="caixa-card">
      <div class="caixa-card-label">Clientes Cadastrados</div>
      <div class="caixa-card-valor">${todosClientes.length}</div>
    </div>
    <div class="caixa-card">
      <div class="caixa-card-label">Data</div>
      <div class="caixa-card-valor" style="font-size:16px">${hoje}</div>
    </div>`;

  const tbody = document.getElementById('tbody-caixa');
  if (!Object.keys(pgtos).length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--cinza);padding:20px">Nenhum movimento hoje</td></tr>';
    return;
  }

  tbody.innerHTML = Object.entries(pgtos).map(([pg, v]) => `
    <tr>
      <td>${icons[pg] || ''} ${pg.charAt(0).toUpperCase() + pg.slice(1)}</td>
      <td>${v.qty}</td>
      <td class="preco-col">${fmt(v.total)}</td>
    </tr>`).join('');
}

async function fecharCaixa() {
  const estado = await window.db.caixaEstado();
  const diaParaFechar = estado?.ultimaData || new Date().toLocaleDateString('pt-BR');
  const doDia = await window.db.pedidosCaixaHoje(diaParaFechar);
  if (!doDia.length) { toast('Nenhum pedido para fechar neste dia pendente', 'info'); return; }

  const total = doDia.reduce((a, p) => a + p.total, 0);
  const hoje = diaParaFechar;
  const confirmar = confirm(
    'FECHAR CAIXA — ' + hoje + '\n\n' +
    'Total de pedidos: ' + doDia.length + '\n' +
    'Faturamento total: ' + fmt(total) + '\n\n' +
    'Isso irá exportar o relatório Excel e ZERAR o caixa para o próximo turno.\n\n' +
    'Confirmar?'
  );

  if (!confirmar) return;

  const exportado = await exportarCaixa({ toastOnSuccess: false, data: diaParaFechar });
  const resultado = await window.db.caixaLimpar(diaParaFechar);
  await renderCaixa({ data: new Date().toLocaleDateString('pt-BR') });
  await atualizarNumPedidoAtual();

  if (exportado?.ok) {
    toast(`🔒 Caixa fechado! ${resultado.qtd} pedido(s) arquivado(s). Relatório exportado.`);
  } else {
    toast(`🔒 Caixa fechado! ${resultado.qtd} pedido(s) arquivado(s).`);
  }
}

async function limparCaixaAtual() {
  await renderCaixa();
  await atualizarNumPedidoAtual();
}

function construirHtmlRelatorio(lista, { titulo, subtitulo }) {
  const total = lista.reduce((a, p) => a + p.total, 0);
  const pedidos = lista.length;
  const ticketMedio = pedidos ? total / pedidos : 0;
  const pgtos = {};
  lista.forEach(p => {
    if (!pgtos[p.pgto]) pgtos[p.pgto] = { qty: 0, total: 0 };
    pgtos[p.pgto].qty++;
    pgtos[p.pgto].total += p.total;
  });

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <!--[if gte mso 9]>
      <xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>${titulo}</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml>
      <![endif]-->
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; }
        h2 { color: #C2580A; font-size: 14pt; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
        th { background: #F97316; color: #fff; padding: 8px 12px; text-align: left; border: 1px solid #ddd; }
        td { padding: 7px 12px; border: 1px solid #ddd; font-size: 10pt; }
        tr:nth-child(even) td { background: #FFF7ED; }
        .laranja { color: #C2580A; font-weight: bold; }
        .verde { color: #15803D; font-weight: bold; }
        .footer td { background: #F97316; color: #fff; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>DG Lanches — ${titulo}</h2>
      <p>${subtitulo}</p><br>
      <table>
        <thead><tr><th>Resumo</th><th>Valor</th></tr></thead>
        <tbody>
          <tr><td>Total de Pedidos</td><td>${pedidos}</td></tr>
          <tr><td>Faturamento Total</td><td class="laranja">R$ ${total.toFixed(2).replace('.', ',')}</td></tr>
          <tr><td>Ticket Médio</td><td class="verde">R$ ${ticketMedio.toFixed(2).replace('.', ',')}</td></tr>
        </tbody>
      </table>
      <table>
        <thead><tr><th>Forma de Pagamento</th><th>Qtd Pedidos</th><th>Total</th></tr></thead>
        <tbody>
          ${Object.entries(pgtos).map(([pg, v]) => `
            <tr>
              <td>${pg.charAt(0).toUpperCase() + pg.slice(1)}</td>
              <td>${v.qty}</td>
              <td class="laranja">R$ ${v.total.toFixed(2).replace('.', ',')}</td>
            </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr class="footer">
            <td>TOTAL GERAL</td>
            <td>${pedidos} pedidos</td>
            <td>R$ ${total.toFixed(2).replace('.', ',')}</td>
          </tr>
        </tfoot>
      </table>
      <table>
        <thead><tr><th>#</th><th>Cliente</th><th>Mesa</th><th>Itens</th><th>Tipo</th><th>Pagamento</th><th>Subtotal</th><th>Desconto</th><th>Taxa Entrega</th><th>Total</th><th>Hora</th><th>Data</th></tr></thead>
        <tbody>
          ${lista.map(p => {
            const itensStr = (p.itens || []).map(i => (i.quantidade || i.qty || 1) + 'x ' + i.nome).join(', ');
            return `
            <tr>
              <td>#${String(p.seq || p.id).padStart(3, '0')}</td>
              <td>${p.cliente}</td>
              <td>${p.mesa || '-'}</td>
              <td style="font-size:9pt;color:#555">${itensStr || '-'}</td>
              <td>${p.tipo}</td>
              <td>${p.pgto}</td>
              <td>R$ ${Number(p.subtotal||0).toFixed(2).replace('.', ',')}</td>
              <td>${Number(p.desconto||0).toFixed(2).replace('.', ',')}%</td>
              <td>R$ ${Number(p.taxa_entrega||0).toFixed(2).replace('.', ',')}</td>
              <td class="laranja">R$ ${Number(p.total).toFixed(2).replace('.', ',')}</td>
              <td>${p.hora}</td>
              <td>${p.data}</td>
            </tr>`;}).join('')}
        </tbody>
      </table>
    </body></html>`;
}

async function baixarHtmlComoExcel(html, nomeArquivo) {
  try {
    const resultado = await window.db.salvarRelatorio(nomeArquivo, html);
    if (resultado?.ok) {
      toast(`📁 Relatório salvo em ${resultado.path}`);
      return { ok: true, path: resultado.path };
    }
    if (resultado?.canceled) {
      return { ok: false, canceled: true };
    }
  } catch (e) {
    console.warn('Falha ao salvar relatório no projeto:', e);
  }

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

async function exportarCaixa({ toastOnSuccess = true, data } = {}) {
  const estado = await window.db.caixaEstado();
  const hoje = data || estado?.ultimaData || new Date().toLocaleDateString('pt-BR');
  const doDia = await window.db.pedidosCaixaHoje(data);

  if (!doDia.length) { if (toastOnSuccess) toast('Nenhum movimento hoje para exportar', 'info'); return; }

  const html = construirHtmlRelatorio(doDia, {
    titulo: 'Fechamento de Caixa',
    subtitulo: `Data: <b>${hoje}</b>`
  });
  const resultado = await baixarHtmlComoExcel(html, `fechamento_caixa_${hoje.replace(/\//g, '-')}.xls`);

  if (toastOnSuccess && resultado?.ok && !resultado?.canceled) toast('📊 Fechamento exportado para Excel!');
  return resultado;
}

async function exportarRelatorioMensal() {
  const lista = await window.db.caixaRelatorio('mensal');
  if (!lista.length) { toast('Nenhum movimento neste mês para exportar', 'info'); return; }
  const hoje = new Date();
  const html = construirHtmlRelatorio(lista.map((p, idx) => ({ ...p, seq: idx + 1 })), {
    titulo: 'Relatório Mensal',
    subtitulo: `Período: <b>${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}</b>`
  });
  const resultado = await baixarHtmlComoExcel(html, `relatorio_mensal_${hoje.getFullYear()}_${String(hoje.getMonth() + 1).padStart(2, '0')}.xls`);
  if (resultado?.ok && !resultado?.canceled) toast('📅 Relatório mensal exportado.');
}

async function exportarRelatorioAnual() {
  const lista = await window.db.caixaRelatorio('anual');
  if (!lista.length) { toast('Nenhum movimento neste ano para exportar', 'info'); return; }
  const hoje = new Date();
  const html = construirHtmlRelatorio(lista.map((p, idx) => ({ ...p, seq: idx + 1 })), {
    titulo: 'Relatório Anual',
    subtitulo: `Período: <b>${hoje.getFullYear()}</b>`
  });
  const resultado = await baixarHtmlComoExcel(html, `relatorio_anual_${hoje.getFullYear()}.xls`);
  if (resultado?.ok && !resultado?.canceled) toast('📆 Relatório anual exportado.');
}