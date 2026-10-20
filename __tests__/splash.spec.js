const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('splash page does not depend on remote Google Fonts', () => {
  const splashPath = path.join(__dirname, '..', 'splash.html');
  const html = fs.readFileSync(splashPath, 'utf8');

  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
});
