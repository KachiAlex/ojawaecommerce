// lint-prod.js
// Warns if console.log or debugger statements are present in production code

const fs = require('fs');
const path = require('path');

function scan(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scan(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (/console\.log\s*\(/.test(content)) {
        console.warn(`console.log found in ${fullPath}`);
      }
      if (/debugger;/.test(content)) {
        console.warn(`debugger statement found in ${fullPath}`);
      }
    }
  }
}

scan(path.join(__dirname, '..'));
