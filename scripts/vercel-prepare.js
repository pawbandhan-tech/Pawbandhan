const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const frontendDir = path.join(root, 'frontend');
const assetsSrc = path.join(root, 'assets');
const publicAssets = path.join(frontendDir, 'public', 'assets');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

console.log('Vercel prepare: syncing assets to frontend/public…');
copyDir(assetsSrc, publicAssets);

console.log('Vercel prepare: building React + Vite frontend…');
execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

console.log('Vercel prepare: done — output in frontend/dist');
console.log('Set DATABASE_URL in Vercel env for Neon API');
