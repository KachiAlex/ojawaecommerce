/**
 * Migration: Add Phase 1 columns to products and orders tables
 * Run with: node scripts/migrate_phase1_columns.js
 */
const path = require('path');
const fs = require('fs');

// Load environment variables
const envFiles = ['.env', '.env.local'];
envFiles.forEach((file) => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    require('dotenv').config({ path: fullPath, override: true });
  }
});

const { sequelize } = require('../models');

async function migrate() {
  console.log('🔄 Starting Phase 1 migration...');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // --- Add variants column to products ---
    const productCols = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='variants'", { type: sequelize.QueryTypes.SELECT });
    if (productCols.length === 0) {
      console.log('  Adding variants column to products...');
      await sequelize.query('ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "variants" JSONB');
      console.log('  ✅ variants column added');
    } else {
      console.log('  ⏭️  variants column already exists on products');
    }

    // --- Add columns to orders ---
    const orderCols = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name='orders'", { type: sequelize.QueryTypes.SELECT });
    const existingOrderCols = orderCols.map(c => c.column_name);

    const newCols = [
      { name: 'isGuest', sql: 'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "isGuest" BOOLEAN DEFAULT false' },
      { name: 'guestEmail', sql: 'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guestEmail" VARCHAR(255)' },
      { name: 'guestPhone', sql: 'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guestPhone" VARCHAR(255)' },
      { name: 'returnStatus', sql: "ALTER TABLE \"orders\" ADD COLUMN IF NOT EXISTS \"returnStatus\" VARCHAR(20) DEFAULT 'none'" },
      { name: 'returnReason', sql: 'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "returnReason" TEXT' },
      { name: 'returnRequestedAt', sql: 'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "returnRequestedAt" TIMESTAMP' },
      { name: 'returnApprovedAt', sql: 'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "returnApprovedAt" TIMESTAMP' },
      { name: 'returnRejectedAt', sql: 'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "returnRejectedAt" TIMESTAMP' },
      { name: 'returnTrackingNumber', sql: 'ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "returnTrackingNumber" VARCHAR(255)' },
    ];

    for (const col of newCols) {
      if (!existingOrderCols.includes(col.name)) {
        console.log(`  Adding ${col.name} column to orders...`);
        await sequelize.query(col.sql);
        console.log(`  ✅ ${col.name} column added`);
      } else {
        console.log(`  ⏭️  ${col.name} column already exists on orders`);
      }
    }

    console.log('✅ Phase 1 migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrate();
