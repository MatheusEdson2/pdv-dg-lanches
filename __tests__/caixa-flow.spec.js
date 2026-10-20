const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('caixa.js chama pedidosCaixaHoje com a data recebida', () => {
  const caixaSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'caixa.js'), 'utf8');
  assert.match(caixaSrc, /window\.db\.pedidosCaixaHoje\(diaParaFechar\)/);
  assert.match(caixaSrc, /window\.db\.pedidosCaixaHoje\(data\)/);
});

test('preload expõe caixaLimpar com o argumento data', () => {
  const preloadSrc = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
  assert.match(preloadSrc, /caixaLimpar: \(data\) => ipcRenderer\.invoke\('caixa:limpar', data\)/);
});
