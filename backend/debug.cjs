const cp = require('child_process');
const fs = require('fs');
const p = cp.spawnSync('node', ['app.js'], { stdio: 'pipe' });
fs.writeFileSync('debug-err.log', p.stderr.toString('utf8'));
fs.writeFileSync('debug-out.log', p.stdout.toString('utf8'));
console.log('Saved to debug-err.log');
