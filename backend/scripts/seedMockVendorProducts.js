const path = require('path');
const dotenvPath = path.resolve(__dirname, '..', '.env');
const dotenvLocalPath = path.resolve(__dirname, '..', '.env.local');

require('dotenv').config({ path: dotenvPath });
require('dotenv').config({ path: dotenvLocalPath });

const bcrypt = require('bcryptjs');
const FALLBACK_DATABASE_URL = 'postgresql://neondb_owner:npg_Da79GjxwVoIM@ep-flat-surf-ap5wq3vs-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'null' || process.env.DATABASE_URL === 'undefined') {
  process.env.DATABASE_URL = FALLBACK_DATABASE_URL;
}

const { sequelize } = require('../config/database');
const UserDefinition = require('../models/User');
const VendorDefinition = require('../models/Vendor');
const ProductDefinition = require('../models/Product');

const User = UserDefinition.init(sequelize);
const Vendor = VendorDefinition.init(sequelize);
const Product = ProductDefinition.init(sequelize);

Vendor.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Vendor, { foreignKey: 'userId', as: 'vendor' });

Product.belongsTo(Vendor, { foreignKey: 'vendorId', as: 'vendor' });
Vendor.hasMany(Product, { foreignKey: 'vendorId', as: 'products' });

const vendorProfile = {
  email: process.env.MOCK_VENDOR_EMAIL || 'kitchenstore@ojawa.com',
  password: process.env.MOCK_VENDOR_PASSWORD || 'KitchenStore123!',
  firstName: 'Kitchen',
  lastName: 'Store',
  storeName: 'Ojawa Kitchen Hub',
  phone: '+2348000000000',
  description: 'Curated kitchen appliances, cookware, and tools with escrow-backed fulfillment.'
};

const ASSET_BASE_URL = process.env.PRODUCT_IMAGE_BASE_URL || 'https://ojawa.africa/assets/catalog';

const buildAssetImage = (assetName) => {
  const safeAsset = assetName || 'mixer.jpg';
  return `${ASSET_BASE_URL}/${safeAsset}`;
};

const baseTemplates = [
  {
    name: 'Ninja Foodi Pressure Cooker',
    description: 'Multi-cooker with crisping lid for pressure cooking, air frying, baking, and roasting.',
    category: 'home',
    basePrice: 149.99,
    priceStep: 4,
    stock: 24,
    specifications: { power: '1400W', capacity: '6.5 qt', warranty: '2 years' },
    tags: ['appliance', 'multi-cooker'],
    skuPrefix: 'NFPC',
    asset: 'multicooker.jpg'
  },
  {
    name: 'Breville Barista Espresso Machine',
    description: 'Semi-automatic espresso station with precise temperature control and steam wand.',
    category: 'home',
    basePrice: 549.99,
    priceStep: 7,
    stock: 12,
    specifications: { power: '1600W', boiler: 'Thermocoil', grinder: 'Conical Burr' },
    tags: ['coffee', 'espresso'],
    skuPrefix: 'BBE',
    asset: 'espresso.jpg'
  },
  {
    name: 'Le Creuset Signature Dutch Oven',
    description: 'Enamelled cast iron Dutch oven ideal for braising, soups, and sourdough.',
    category: 'home',
    basePrice: 329.99,
    priceStep: 5,
    stock: 18,
    specifications: { material: 'Enameled Cast Iron', capacity: '5.5 qt', ovenSafe: '500°F' },
    tags: ['cookware'],
    skuPrefix: 'LCSDO',
    asset: 'dutch-oven.jpg'
  },
  {
    name: 'All-Clad Stainless Steel Fry Pan Set',
    description: 'Tri-ply stainless steel fry pans with even heating for searing and sautéing.',
    category: 'home',
    basePrice: 189.99,
    priceStep: 3,
    stock: 30,
    specifications: { material: 'Tri-ply Stainless', ovenSafe: '600°F', dishwasherSafe: true },
    tags: ['cookware', 'pan'],
    skuPrefix: 'ACFP',
    asset: 'cookware.jpg'
  },
  {
    name: 'KitchenAid Artisan Stand Mixer',
    description: 'Iconic stand mixer with planetary mixing action and attachment hub.',
    category: 'home',
    basePrice: 299.99,
    priceStep: 6,
    stock: 20,
    specifications: { bowl: '5 qt Stainless', motor: '325W', speeds: 10 },
    tags: ['baking', 'mixer'],
    skuPrefix: 'KAASM',
    asset: 'mixer.jpg'
  }
];

const palette = ['Onyx', 'Glacier', 'Sage', 'Crimson', 'Sandstone'];

function generateProducts(target = 50) {
  const products = [];
  let skuCounter = 1001;

  while (products.length < target) {
    const template = baseTemplates[products.length % baseTemplates.length];
    const variantIndex = Math.floor(products.length / baseTemplates.length) + 1;
    const color = palette[variantIndex % palette.length];
    const price = Number((template.basePrice + variantIndex * template.priceStep).toFixed(2));

    const productName = `${template.name} - ${color} Edition ${variantIndex}`;
    const imageUrl = buildAssetImage(template.asset);
    products.push({
      name: productName,
      description: `${template.description} Tuned for ${color.toLowerCase()}-themed kitchens and batch ${variantIndex}.`,
      category: template.category,
      price,
      stockQuantity: template.stock + variantIndex * 2,
      images: [imageUrl],
      thumbnail: imageUrl,
      specifications: {
        ...template.specifications,
        color,
        sku: `${template.skuPrefix}-${skuCounter++}`
      }
    });
  }

  return products;
}

async function ensureVendor() {
  const passwordHash = await bcrypt.hash(vendorProfile.password, 12);

  const [user, userCreated] = await User.findOrCreate({
    where: { email: vendorProfile.email },
    defaults: {
      role: 'vendor',
      password: passwordHash,
      firstName: vendorProfile.firstName,
      lastName: vendorProfile.lastName,
      profile: {
        displayName: vendorProfile.storeName,
        phone: vendorProfile.phone
      },
      isEmailVerified: true
    }
  });

  if (!userCreated && user.role !== 'vendor') {
    await user.update({ role: 'vendor' });
  }

  await Vendor.findOrCreate({
    where: { userId: user.id },
    defaults: {
      storeName: vendorProfile.storeName,
      storeDescription: vendorProfile.description,
      businessEmail: vendorProfile.email,
      businessPhone: vendorProfile.phone,
      businessAddress: {
        street: '42 Market Street',
        city: 'Lagos',
        country: 'Nigeria'
      },
      isApproved: true,
      status: 'approved'
    }
  });

  return user.id;
}

async function seedProducts() {
  await sequelize.authenticate();
  const vendorId = await ensureVendor();
  const products = generateProducts(50);

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    const existing = await Product.findOne({ where: { vendorId, name: product.name } });
    if (existing) {
      skipped++;
      continue;
    }

    await Product.create({
      vendorId,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      stockQuantity: product.stockQuantity,
      images: product.images,
      specifications: product.specifications,
      status: 'approved'
    });
    created++;
  }

  console.log(`✅ Seeded ${created} products (skipped ${skipped} duplicates) for vendor ${vendorProfile.email}`);
}

if (require.main === module) {
  seedProducts()
    .then(() => {
      console.log('🎉 Product seeding completed');
      return sequelize.close();
    })
    .catch((error) => {
      console.error('❌ Product seeding failed:', error);
      return sequelize.close().finally(() => process.exit(1));
    });
}

module.exports = { seedProducts };
