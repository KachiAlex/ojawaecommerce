const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

async function convertUserIdsToStrings() {
  console.log('🔧 Starting user ID conversion to STRING(128)...');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');
    const queryInterface = sequelize.getQueryInterface();

    const constraintsToDrop = [
      { table: 'carts', name: 'carts_userId_fkey' },
      { table: 'vendors', name: 'vendors_userId_fkey' },
      { table: 'wallets', name: 'wallets_userId_fkey' },
      { table: 'notifications', name: 'notifications_userId_fkey' },
      { table: 'wallet_transactions', name: 'wallet_transactions_userId_fkey' },
      { table: 'withdrawals', name: 'withdrawals_userId_fkey' },
      { table: 'security_audit_logs', name: 'security_audit_logs_userId_fkey' },
      { table: 'analytics_events', name: 'analytics_events_userId_fkey' },
      { table: 'admin_audit_logs', name: 'admin_audit_logs_adminId_fkey' },
      { table: 'orders', name: 'orders_buyerId_fkey' },
      { table: 'orders', name: 'orders_vendorId_fkey' },
      { table: 'products', name: 'products_vendorId_fkey' },
      { table: 'escrow_releases', name: 'escrow_releases_vendorId_fkey' },
      { table: 'messages', name: 'messages_senderId_fkey' }
    ];

    for (const { table, name } of constraintsToDrop) {
      try {
        await queryInterface.removeConstraint(table, name);
        console.log(`⚙️  Dropped constraint ${name} on ${table}`);
      } catch (error) {
        console.log(`ℹ️  Skipping constraint ${name} on ${table}: ${error.message}`);
      }
    }

    await sequelize.query('ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;');
    await queryInterface.changeColumn('users', 'id', {
      type: DataTypes.STRING(128),
      allowNull: false
    });

    const stringColumns = [
      { table: 'carts', column: 'userId' },
      { table: 'vendors', column: 'userId' },
      { table: 'wallets', column: 'userId' },
      { table: 'notifications', column: 'userId' },
      { table: 'wallet_transactions', column: 'userId' },
      { table: 'withdrawals', column: 'userId' },
      { table: 'security_audit_logs', column: 'userId', allowNull: true },
      { table: 'analytics_events', column: 'userId', allowNull: true },
      { table: 'admin_audit_logs', column: 'adminId' },
      { table: 'admin_audit_logs', column: 'targetUserId', allowNull: true },
      { table: 'orders', column: 'buyerId' },
      { table: 'orders', column: 'vendorId' },
      { table: 'products', column: 'vendorId' },
      { table: 'escrow_releases', column: 'vendorId' },
      { table: 'escrow_releases', column: 'releasedBy' },
      { table: 'messages', column: 'senderId' }
    ];

    for (const { table, column, allowNull = false } of stringColumns) {
      try {
        await queryInterface.changeColumn(table, column, {
          type: DataTypes.STRING(128),
          allowNull
        });
        console.log(`✅ Converted ${table}.${column} to STRING(128)`);
      } catch (error) {
        console.error(`❌ Failed to convert ${table}.${column}:`, error.message);
        throw error;
      }
    }

    await sequelize.query('ALTER TABLE "conversations" ALTER COLUMN "participantIds" TYPE TEXT[] USING "participantIds"::text[];');
    await queryInterface.changeColumn('conversations', 'createdBy', {
      type: DataTypes.STRING(128),
      allowNull: true
    });
    await queryInterface.changeColumn('messages', 'senderId', {
      type: DataTypes.STRING(128),
      allowNull: false
    });

    const constraintsToAdd = [
      { table: 'carts', fields: ['userId'], name: 'carts_userId_fkey' },
      { table: 'vendors', fields: ['userId'], name: 'vendors_userId_fkey' },
      { table: 'wallets', fields: ['userId'], name: 'wallets_userId_fkey' },
      { table: 'notifications', fields: ['userId'], name: 'notifications_userId_fkey' },
      { table: 'wallet_transactions', fields: ['userId'], name: 'wallet_transactions_userId_fkey' },
      { table: 'withdrawals', fields: ['userId'], name: 'withdrawals_userId_fkey' },
      { table: 'security_audit_logs', fields: ['userId'], name: 'security_audit_logs_userId_fkey' },
      { table: 'analytics_events', fields: ['userId'], name: 'analytics_events_userId_fkey' },
      { table: 'admin_audit_logs', fields: ['adminId'], name: 'admin_audit_logs_adminId_fkey' },
      { table: 'orders', fields: ['buyerId'], name: 'orders_buyerId_fkey' },
      { table: 'orders', fields: ['vendorId'], name: 'orders_vendorId_fkey' },
      { table: 'products', fields: ['vendorId'], name: 'products_vendorId_fkey' },
      { table: 'escrow_releases', fields: ['vendorId'], name: 'escrow_releases_vendorId_fkey' },
      { table: 'messages', fields: ['senderId'], name: 'messages_senderId_fkey' }
    ];

    for (const { table, fields, name } of constraintsToAdd) {
      try {
        await queryInterface.addConstraint(table, {
          fields,
          type: 'foreign key',
          name,
          references: {
            table: 'users',
            field: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        });
        console.log(`🔗 Added constraint ${name} on ${table}`);
      } catch (error) {
        console.error(`❌ Failed to add constraint ${name} on ${table}:`, error.message);
        throw error;
      }
    }

    console.log('🎉 User-related columns converted successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    process.exit(1);
  }
}

convertUserIdsToStrings();
