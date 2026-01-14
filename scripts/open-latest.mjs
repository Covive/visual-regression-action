// scripts/open-latest.mjs
import fs from 'fs';
import { execFileSync, execSync } from 'child_process';

const p = 'reports/latest.html';
if (!fs.existsSync(p)) {
  console.error('reports/latest.html not found');
  process.exit(1);
}

try {
  if (process.platform === 'darwin') {
    execFileSync('open', [p], { stdio: 'inherit' });
  } else if (process.platform === 'win32') {
    // use cmd's start; empty title arg after /c start
    execSync(`start "" "${p}"`, { stdio: 'inherit', shell: true });
  } else {
    execFileSync('xdg-open', [p], { stdio: 'inherit' });
  }
} catch (e) {
  console.error('Failed to open the report automatically. Here is the path:');
  console.error(p);
  process.exit(0);
}