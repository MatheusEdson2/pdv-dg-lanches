function compararDatas(a, b) {
  const [da, ma, aa] = String(a || '').split('/').map(Number);
  const [db, mb, ab] = String(b || '').split('/').map(Number);
  return new Date(aa, ma - 1, da) - new Date(ab, mb - 1, db);
}

function obterDataCaixaPendente(pedidos) {
  if (!Array.isArray(pedidos) || !pedidos.length) return null;

  const pendentes = pedidos
    .filter((pedido) => pedido && pedido.status === 'pago')
    .map((pedido) => pedido.data)
    .filter(Boolean);

  if (!pendentes.length) return null;

  return [...pendentes].sort(compararDatas).at(-1) || null;
}

function montarEstadoCaixa(pedidos, hoje) {
  const dataPendente = obterDataCaixaPendente(pedidos);
  const aberto = Boolean(dataPendente && dataPendente !== hoje);

  return {
    aberto,
    dataAberta: dataPendente,
    ultimaData: dataPendente,
    hoje,
  };
}

module.exports = {
  obterDataCaixaPendente,
  montarEstadoCaixa,
};
