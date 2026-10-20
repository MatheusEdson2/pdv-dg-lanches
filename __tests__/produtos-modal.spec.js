const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

test('abrirModalProduto foca no primeiro campo do formulário', () => {
  const utilsSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'utils.js'), 'utf8');
  const produtosSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'produtos.js'), 'utf8');

  let focusedElement = null;
  const modal = { classList: { add() {}, remove() {} } };
  const input = { focus() { focusedElement = this; }, value: '' };
  const elements = {
    'modal-produto-title': { textContent: '' },
    'prod-id': { value: '' },
    'prod-nome': input,
    'prod-cat': { value: 'lanche' },
    'prod-preco': { value: '' },
    'prod-desc': { value: '' },
    'prod-emoji': { value: '' },
    'prod-status': { value: '1' },
    'prod-badge': { value: '' },
    'modal-produto': modal,
  };

  const sandbox = {
    console,
    document: {
      getElementById: (id) => elements[id] || null,
      body: { style: {}, classList: { add() {}, remove() {} } },
      activeElement: null,
    },
    window: {},
    produtos: [],
    abrirModal: () => {},
    fecharModal: () => {},
    renderTabelaProdutos: () => {},
    renderCardapio: () => {},
    toast: () => {},
    setTimeout: (fn) => { fn(); },
  };

  vm.createContext(sandbox);
  vm.runInContext(utilsSource + '\n' + produtosSource, sandbox);
  sandbox.abrirModalProduto();

  assert.strictEqual(focusedElement, input);
});
