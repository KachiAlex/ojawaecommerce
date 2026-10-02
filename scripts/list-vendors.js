const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', 'backend', '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', 'backend', '.env.local') });

const FALLBACK_DATABASE_URL = 'postgresql://neondb_owner:npg_Da79GjxwVoIM@ep-flat-surf-ap5wq3vs-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'null' || process.env.DATABASE_URL === 'undefined') {
  process.env.DATABASE_URL = FALLBACK_DATABASE_URL;
}

const { sequelize } = require('../backend/config/database');
const UserDefinition = require('../backend/models/User');
const VendorDefinition = require('../backend/models/Vendor');

const User = UserDefinition.init(sequelize);
const Vendor = VendorDefinition.init(sequelize);

Vendor.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Vendor, { foreignKey: 'userId', as: 'vendor' });

async function listVendors() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    const vendors = await Vendor.findAll({
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isEmailVerified']
      }],
      order: [['createdAt', 'DESC']]
    });

    if (vendors.length === 0) {
      console.log('No vendors found in the database.');
      return;
    }

    console.log(`Found ${vendors.length} vendor(s):\n`);
    console.log('='.repeat(100));

    vendors.forEach((v, i) => {
      const user = v.user;
      console.log(`\n#${i + 1}`);
      console.log('-'.repeat(60));
      console.log(`  Vendor ID:        ${v.id}`);
      console.log(`  Store Name:         ${v.storeName}`);
      console.log(`  Status:             ${v.status}`);
      console.log(`  Is Approved:        ${v.isApproved}`);
      console.log(`  Business Email:     ${v.businessEmail || 'N/A'}`);
      console.log(`  Business Phone:     ${v.businessPhone || 'N/A'}`);
      console.log(`  Rating:             ${v.rating} (${v.totalReviews} reviews)`);
      console.log(`  Created At:         ${v.createdAt}`);
      console.log(`\n  Associated User:`);
      if (user) {
        console.log(`    User ID:          ${user.id}`);
        console.log(`    Email:            ${user.email}`);
        console.log(`    Name:             ${user.firstName || ''} ${user.lastName || ''}`.trim());
        console.log(`    Role:             ${user.role}`);
        console.log(`    Email Verified:   ${user.isEmailVerified}`);
      } else {
        console.log(`    (No associated user found)`);
      }
    });

    console.log('\n' + '='.repeat(100));
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

listVendors();
