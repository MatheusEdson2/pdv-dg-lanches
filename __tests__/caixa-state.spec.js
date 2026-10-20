const test = require('node:test');
const assert = require('node:assert/strict');
const { montarEstadoCaixa, obterDataCaixaPendente } = require('../js/caixa-state');

test('marca caixa aberto quando há pedidos pagos de um dia anterior', () => {
  const hoje = '09/07/2026';
  const pedidos = [
    { data: '08/07/2026', status: 'pago' },
    { data: '09/07/2026', status: 'fechado' },
  ];

  const estado = montarEstadoCaixa(pedidos, hoje);

  assert.equal(estado.aberto, true);
  assert.equal(estado.dataAberta, '08/07/2026');
});

test('não marca caixa aberto quando todos os pedidos pagos já foram fechados', () => {
  const hoje = '09/07/2026';
  const pedidos = [
    { data: '08/07/2026', status: 'fechado' },
    { data: '09/07/2026', status: 'fechado' },
  ];

  const estado = montarEstadoCaixa(pedidos, hoje);

  assert.equal(estado.aberto, false);
  assert.equal(estado.dataAberta, null);
});

test('retorna a data mais recente com caixa ainda aberto', () => {
  const pedidos = [
    { data: '06/07/2026', status: 'pago' },
    { data: '08/07/2026', status: 'pago' },
  ];

  assert.equal(obterDataCaixaPendente(pedidos), '08/07/2026');
});
