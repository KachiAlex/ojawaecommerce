const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Wallet = sequelize.define('Wallet', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: 'NGN'
      },
      isFrozen: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'wallets',
      timestamps: true
    });

    return Wallet;
  }
};
