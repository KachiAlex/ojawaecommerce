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

async function deleteMockProducts() {
  await sequelize.authenticate();
  const vendor = await User.findOne({ where: { email: 'mockvendor@ojawa.com' } });
  if (!vendor) { console.log('Mock vendor not found'); await sequelize.close(); return; }
  const result = await Product.destroy({ where: { vendorId: vendor.id } });
  console.log(`Deleted ${result} mock products`);
  await sequelize.close();
}

if (require.main === module) {
  deleteMockProducts().catch(e => { console.error(e); process.exit(1); });
}
