/**
 * Generate VAPID keys for web push notifications
 * Run: node scripts/generateVapidKeys.js
 * 
 * Add the output to your .env file:
 * VAPID_PUBLIC_KEY=...
 * VAPID_PRIVATE_KEY=...
 * VAPID_SUBJECT=mailto:your-email@example.com
 */
const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();

console.log('\n========================================');
console.log('  VAPID Key Pair for Web Push');
console.log('========================================\n');
console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:noreply@ojawa.com`);
console.log('\n========================================\n');
