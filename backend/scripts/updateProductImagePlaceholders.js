const fs = require('fs');
const path = require('path');

const envFiles = ['.env', '.env.local'];
envFiles.forEach((file) => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    require('dotenv').config({ path: fullPath, override: true });
  }
});

const { sequelize, Product } = require('../models');

const ASSET_BASE_URL = process.env.PRODUCT_IMAGE_BASE_URL || 'https://ojawa.africa/assets/catalog';
const assetRotation = [
  'kitchenaid-stand-mixer.jpg',
  'allclad-pan-set.jpg',
  'breville-barista.jpg',
  'ninja-foodi.jpg',
  'lecreuset-dutch-oven.jpg'
];

const buildImageUrl = (index) => {
  const asset = assetRotation[index % assetRotation.length];
  return `${ASSET_BASE_URL}/${asset}`;
};

(async () => {
  try {
    await sequelize.authenticate();
    const products = await Product.findAll();

    let updated = 0;
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const imageUrl = buildImageUrl(i);
      product.images = [imageUrl];
      product.thumbnail = imageUrl;
      await product.save({ fields: ['images', 'thumbnail'] });
      updated += 1;
    }

    console.log(`✅ Updated placeholder images for ${updated} products.`);
  } catch (error) {
    console.error('❌ Failed to update product images:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
