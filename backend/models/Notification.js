const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Notification = sequelize.define('Notification', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      data: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      orderNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      productName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true
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
      tableName: 'notifications',
      timestamps: true
    });

    return Notification;
  }
};
