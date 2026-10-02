/**
 * Migration: Add notificationPreferences and pushSubscriptions columns to users table
 * Run: node scripts/migrate_notification_columns.js
 */
const { sequelize } = require('../models');

(async () => {
  try {
    console.log('Running notification columns migration...');

    // Add notificationPreferences column
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS "notificationPreferences" JSONB DEFAULT '{"push":{"enabled":true,"orders":true,"payments":true,"disputes":true,"messages":true,"marketing":false},"email":{"enabled":true,"orders":true,"payments":true,"disputes":true,"messages":true,"marketing":false}}'::jsonb
      `);
      console.log('✅ Added notificationPreferences column');
    } catch (e) {
      console.log('ℹ️ notificationPreferences column may already exist:', e.message);
    }

    // Add pushSubscriptions column
    try {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS "pushSubscriptions" JSONB DEFAULT '[]'::jsonb
      `);
      console.log('✅ Added pushSubscriptions column');
    } catch (e) {
      console.log('ℹ️ pushSubscriptions column may already exist:', e.message);
    }

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
})();
