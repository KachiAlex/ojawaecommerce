// Seed or reset admin account directly in PostgreSQL
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const { User } = require('../models');

async function seedAdmin() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });

    const adminEmail = 'admin@ojawa.africa';
    const adminPassword = 'admin123';

    console.log(`🔍 Checking for existing admin: ${adminEmail}`);
    let user = await User.findOne({ where: { email: adminEmail } });

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    if (user) {
      console.log('📋 Found existing admin, updating password and role...');
      await user.update({
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
        displayName: 'Ojawa System Administrator',
        profile: {
          ...user.profile,
          department: 'System Administration',
          accessLevel: 'super_admin',
          adminLevel: 'super_admin'
        }
      });
      console.log('✅ Admin account updated!');
    } else {
      console.log('📝 Creating new admin account...');
      user = await User.create({
        id: 'admin-ojawa-system',
        email: adminEmail,
        password: hashedPassword,
        displayName: 'Ojawa System Administrator',
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
        profile: {
          department: 'System Administration',
          accessLevel: 'super_admin',
          adminLevel: 'super_admin',
          permissions: ['all']
        }
      });
      console.log('✅ Admin account created!');
    }

    // List all admin accounts
    console.log('\n📋 All admin accounts in database:');
    const admins = await User.findAll({
      where: { role: 'admin' },
      attributes: ['id', 'email', 'displayName', 'role', 'isActive', 'createdAt']
    });
    admins.forEach(a => {
      console.log(`  - ${a.email} | ${a.displayName} | active=${a.isActive} | created=${a.createdAt}`);
    });

    console.log(`\n🔑 Login credentials:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Login URL: https://ojawa.africa/admin/login`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedAdmin();
