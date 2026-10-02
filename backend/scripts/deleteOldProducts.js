const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const FALLBACK_DATABASE_URL = 'postgresql://neondb_owner:npg_Da79GjxwVoIM@ep-flat-surf-ap5wq3vs-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'null' || process.env.DATABASE_URL === 'undefined') {
  process.env.DATABASE_URL = FALLBACK_DATABASE_URL;
}

const { sequelize } = require('../config/database');
const UserDef = require('../models/User');
const ProductDef = require('../models/Product');
const User = UserDef.init(sequelize);
const Product = ProductDef.init(sequelize);

const OLD_VENDOR_EMAIL = 'kitchenstore@ojawa.com';

async function deleteOldProducts() {
  await sequelize.authenticate();

  const oldVendor = await User.findOne({ where: { email: OLD_VENDOR_EMAIL } });
  if (!oldVendor) {
    console.log('Old vendor not found, nothing to delete');
    await sequelize.close();
    return;
  }

  const result = await Product.destroy({ where: { vendorId: oldVendor.id } });
  console.log(`Deleted ${result} old products from vendor ${OLD_VENDOR_EMAIL}`);
  await sequelize.close();
}

if (require.main === module) {
  deleteOldProducts().catch(e => { console.error(e); process.exit(1); });
}
module.exports = { deleteOldProducts };
