const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Withdrawal = sequelize.define('Withdrawal', {
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
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      bankDetails: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending'
      },
      reference: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      failureReason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
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
      tableName: 'withdrawals',
      timestamps: true
    });

    return Withdrawal;
  }
};
