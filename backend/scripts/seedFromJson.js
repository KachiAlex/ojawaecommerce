const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const FALLBACK_DATABASE_URL = 'postgresql://neondb_owner:npg_Da79GjxwVoIM@ep-flat-surf-ap5wq3vs-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'null' || process.env.DATABASE_URL === 'undefined') {
  process.env.DATABASE_URL = FALLBACK_DATABASE_URL;
}

const { sequelize } = require('../config/database');
const UserDef = require('../models/User');
const VendorDef = require('../models/Vendor');
const ProductDef = require('../models/Product');
const User = UserDef.init(sequelize);
const Vendor = VendorDef.init(sequelize);
const Product = ProductDef.init(sequelize);

const MOCK_VENDOR = {
  email: 'mockvendor@ojawa.com',
  password: 'MockVendor123!',
  firstName: 'Mock',
  lastName: 'Vendor',
  storeName: 'Ojawa Demo Store',
  phone: '+2348001234567',
  description: 'Demo vendor store for product seeding.'
};

const SEED_JSON_PATH = 'C:/Users/opdli/Downloads/seed_products.json';

async function ensureVendor() {
  const hash = await bcrypt.hash(MOCK_VENDOR.password, 12);
  const [user] = await User.findOrCreate({
    where: { email: MOCK_VENDOR.email },
    defaults: { id: uuidv4(), role: 'vendor', password: hash, firstName: MOCK_VENDOR.firstName, lastName: MOCK_VENDOR.lastName, phoneNumber: MOCK_VENDOR.phone, isEmailVerified: true }
  });
  if (user.role !== 'vendor') await user.update({ role: 'vendor' });
  await Vendor.findOrCreate({
    where: { userId: user.id },
    defaults: { storeName: MOCK_VENDOR.storeName, storeDescription: MOCK_VENDOR.description, businessEmail: MOCK_VENDOR.email, businessPhone: MOCK_VENDOR.phone, businessAddress: { street: '42 Market St', city: 'Lagos', country: 'Nigeria' }, isApproved: true, status: 'approved' }
  });
  return user.id;
}

async function seedProducts() {
  await sequelize.authenticate();
  const vendorId = await ensureVendor();

  // Delete existing mock vendor products
  const deleted = await Product.destroy({ where: { vendorId } });
  console.log('Deleted ' + deleted + ' existing mock products');

  const products = require(SEED_JSON_PATH);
  let created = 0;

  for (const p of products) {
    const specs = {
      sku: p.sku,
      rating: p.rating,
      reviewCount: p.review_count,
      compareAtPrice: p.compare_at_price,
      tags: p.tags,
      subcategory: p.subcategory,
      slug: p.slug
    };

    await Product.create({
      vendorId,
      name: p.name,
      description: p.description,
      price: p.price,
      stockQuantity: p.stock,
      category: p.category.toLowerCase().replace(/\s*&\s*/g, '-').replace(/\s+/g, '-'),
      images: p.images,
      thumbnail: p.thumbnail,
      specifications: specs,
      status: 'approved'
    });
    created++;
  }

  console.log('Seeded ' + created + ' products from JSON for ' + MOCK_VENDOR.email);
}

if (require.main === module) {
  seedProducts()
    .then(() => { console.log('Done'); return sequelize.close(); })
    .catch(e => { console.error('Failed:', e); sequelize.close().finally(() => process.exit(1)); });
}
module.exports = { seedProducts };
