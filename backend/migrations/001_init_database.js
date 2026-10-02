const { sequelize } = require('../config/database');
const {
  User,
  Product,
  Order,
  Cart,
  CartItem,
  Vendor,
  Wallet,
  Notification,
  Conversation,
  Message,
} = require('../models');

async function initDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    console.log('🔄 Creating tables...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ All tables created successfully.');

    console.log('📊 Tables created:');
    console.log('  - users');
    console.log('  - products');
    console.log('  - orders');
    console.log('  - carts');
    console.log('  - cart_items');
    console.log('  - vendors');
    console.log('  - wallets');
    console.log('  - notifications');
    console.log('  - conversations');
    console.log('  - messages');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

initDatabase();
