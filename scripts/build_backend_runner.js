const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const venvPython = process.platform === 'win32'
  ? path.join('.venv', 'Scripts', 'python.exe')
  : path.join('.venv', 'bin', 'python');
const python = fs.existsSync(venvPython)
  ? venvPython
  : process.platform === 'win32' ? 'python' : 'python3';

const result = spawnSync(python, ['scripts/build_backend.py'], { stdio: 'inherit' });
if (result.error) {
  console.error(`Failed to run ${python}: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
