// firestore-index-audit.js
// Checks if all required Firestore indexes are present in firestore.indexes.json

const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '../firestore.indexes.json');
if (!fs.existsSync(indexFile)) {
  console.error('firestore.indexes.json not found!');
  process.exit(1);
}

const indexes = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
if (!indexes.indexes || !Array.isArray(indexes.indexes)) {
  console.error('No indexes found in firestore.indexes.json');
  process.exit(1);
}

console.log(`Found ${indexes.indexes.length} Firestore indexes.`);
indexes.indexes.forEach((idx, i) => {
  console.log(`Index ${i + 1}:`, JSON.stringify(idx));
});
