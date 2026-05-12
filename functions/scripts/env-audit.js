// env-audit.js
// Checks for required environment variables and warns if any are missing or hardcoded
require('dotenv').config();

const requiredVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_WEBHOOK_SECRET',
  'WALLET_ADMIN_SECRET',
  'NODE_ENV'
];

let missing = [];
for (const v of requiredVars) {
  if (!process.env[v]) missing.push(v);
}

if (missing.length) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
} else {
  console.log('All required environment variables are set.');
}

// Optionally, scan for hardcoded secrets in codebase
const fs = require('fs');
const path = require('path');

function scanForSecrets(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanForSecrets(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (/AIza[0-9A-Za-z-_]{35}/.test(content) || /sk_live_[0-9a-zA-Z]+/.test(content)) {
        console.warn(`Possible hardcoded secret in ${fullPath}`);
      }
    }
  }
}

scanForSecrets(path.join(__dirname, '..'));
