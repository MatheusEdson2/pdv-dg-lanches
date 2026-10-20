const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const mainPath = path.join(repoRoot, 'main.js');

test('main.js parses without syntax errors', () => {
  assert.doesNotThrow(() => {
    execFileSync(process.execPath, ['--check', mainPath], {
      cwd: repoRoot,
      stdio: 'pipe',
      encoding: 'utf8',
    });
  });
});

test('main.js loads splash and main HTML via absolute paths', () => {
  const content = fs.readFileSync(mainPath, 'utf8');
  assert.match(content, /loadFile\(path\.join\(__dirname, ['"]splash\.html['"]\)\)/);
  assert.match(content, /loadFile\(path\.join\(__dirname, ['"]index\.html['"]\)\)/);
});

test('splash page reports ready immediately after reaching 100%', () => {
  const splashPath = path.join(repoRoot, 'splash.html');
  const content = fs.readFileSync(splashPath, 'utf8');
  assert.match(content, /window\.splashAPI\.pronto\(\)/);
  assert.doesNotMatch(content, /setTimeout\(\(\) => \{\s*if \(window\.splashAPI\) window\.splashAPI\.pronto\(\);\s*\},\s*180\)/);
});
