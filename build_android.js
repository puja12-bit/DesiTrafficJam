const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    let entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        let srcPath = path.join(src, entry.name);
        let destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

if (!fs.existsSync('www')) fs.mkdirSync('www');

// Copy assets
copyDir('assets', 'www/assets');

// Copy mobile/index.html and fix paths
let index = fs.readFileSync('mobile/index.html', 'utf8');
index = index.replace(/\.\.\/assets\//g, 'assets/');
fs.writeFileSync('www/index.html', index);

console.log('Build completed to www/');
