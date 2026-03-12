// cors-audit.js
// Checks CORS settings for allowed origins

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../server.js');
const content = fs.readFileSync(serverPath, 'utf8');

const allowedOrigins = content.match(/allowedOrigins\s*=\s*new Set\(([^)]+)\)/);
if (allowedOrigins) {
  console.log('Allowed CORS origins found:', allowedOrigins[1]);
} else {
  console.warn('No explicit allowedOrigins set in server.js. Review CORS configuration!');
}

if (/app\.use\(cors\(\)\)/.test(content)) {
  console.warn('CORS is set to allow all origins. Restrict this for production!');
} else {
  console.log('CORS is not open to all origins.');
}
