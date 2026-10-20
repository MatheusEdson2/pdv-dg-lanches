const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('calcula subtotal e total com desconto percentual corretamente', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'carrinho.js'), 'utf8');
  const sandbox = {
    console,
    window: {},
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
      querySelector: () => null,
    },
    toast: () => {},
    salvarEstadoPedido: () => {},
    sincronizarMesaAtiva: () => {},
    tipoEntrega: 'balcao',
    formaPgto: 'dinheiro',
    carrinho: [],
    produtos: [],
    mesasAbertas: {},
    mesaAtivaKey: null,
    mesaAtual: '',
    mesaPedidoAberto: null,
    clienteSelecionado: null,
    snapRetirada: null,
    snapDelivery: null,
    limparEstadoPedidoStorage: () => {},
    renderMesasPanel: () => {},
    restaurarSnapshotMesa: () => {},
    capturarSnapshotMesa: () => ({})
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  assert.equal(sandbox.calcularSubtotalPedido([{ preco: 10, qty: 2 }, { preco: 5, qty: 1 }]), 25);
  assert.equal(sandbox.calcularTotalPedido({ itens: [{ preco: 10, qty: 2 }, { preco: 5, qty: 1 }], descontoPercent: 10, taxaEntrega: 3 }), 25.5);
  assert.equal(sandbox.calcularTotalPedido({ itens: [{ preco: 10, qty: 2 }], descontoPercent: 15, taxaEntrega: 0 }), 17);
});
