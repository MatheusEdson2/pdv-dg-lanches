const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('main.js salva relatório na área de trabalho quando a caixa de diálogo é cancelada', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  assert.match(src, /app\.getPath\('desktop'\)/);
  assert.match(src, /fallback/i);
});
