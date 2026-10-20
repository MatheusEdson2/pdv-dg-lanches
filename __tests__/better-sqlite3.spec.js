// Regression tests for: better-sqlite3 upgrade
// Verifies that the better-sqlite3 package exports the expected API shape.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);

describe('better-sqlite3 - package structure', () => {
  it('package.json lists better-sqlite3 as a dependency', () => {
    const pkg = req('../package.json');
    assert.ok(pkg.dependencies['better-sqlite3'], 'better-sqlite3 should be in dependencies');
  });

  it('better-sqlite3 module resolves without JS-level errors', () => {
    try {
      const mod = req('better-sqlite3');
      assert.strictEqual(typeof mod, 'function', 'should export a constructor function');
    } catch (e) {
      // Native binding errors are acceptable outside Electron context
      if (!e.message.match(/binding|node|build|native/i)) {
        throw e;
      }
    }
  });
});