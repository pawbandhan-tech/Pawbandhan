const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const assetsSrc = path.join(root, 'assets');
const assetsDest = path.join(root, 'web_app', 'assets');

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

copyDir(assetsSrc, assetsDest);
console.log('Vercel prepare: assets copied to web_app/assets');
console.log('Vercel prepare: API runs via /api serverless (set DATABASE_URL in Vercel env)');
