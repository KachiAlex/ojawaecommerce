const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const WalletTransaction = sequelize.define('WalletTransaction', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      type: {
        type: DataTypes.ENUM('topup', 'escrow_release', 'withdrawal', 'payment', 'refund'),
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      withdrawalId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      reference: {
        type: DataTypes.STRING,
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending'
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'wallet_transactions',
      timestamps: true,
      updatedAt: false
    });

    return WalletTransaction;
  }
};
