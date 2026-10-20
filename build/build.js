const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectDir = path.resolve(__dirname, '..');
const distDir = path.join(projectDir, 'dist');

function cleanDist() {
  if (!fs.existsSync(distDir)) {
    return;
  }

  for (const entry of fs.readdirSync(distDir)) {
    const fullPath = path.join(distDir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      continue;
    }
    const name = entry.toLowerCase();
    if (name.endsWith('.exe') && !name.includes('setup 1.0.0') && !name.includes('uninstall')) {
      fs.unlinkSync(fullPath);
    }
  }
}

function runBuilder() {
  const result = spawnSync('npx', ['electron-builder', '--win', '--x64'], {
    cwd: projectDir,
    stdio: 'inherit',
    shell: true,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`electron-builder failed with exit code ${result.status}`);
  }
}

function main() {
  cleanDist();
  runBuilder();
  console.log('Build finished.');
}

main();
