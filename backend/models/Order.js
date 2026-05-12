const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Order = sequelize.define('Order', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      buyerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      vendorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      items: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'),
        defaultValue: 'pending'
      },
      paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        defaultValue: 'pending'
      },
      paymentMethod: DataTypes.STRING,
      paymentReference: DataTypes.STRING,
      shippingAddress: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      trackingNumber: DataTypes.STRING,
      estimatedDelivery: DataTypes.DATE,
      actualDelivery: DataTypes.DATE,
      notes: DataTypes.TEXT,
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'orders',
      timestamps: true
    });

    return Order;
  }
};
