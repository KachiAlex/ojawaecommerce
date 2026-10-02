const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const DeliveryTracking = sequelize.define('DeliveryTracking', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      trackingNumber: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id'
        }
      },
      partnerId: {
        type: DataTypes.STRING(128),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      status: {
        type: DataTypes.ENUM('pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled'),
        defaultValue: 'pending'
      },
      origin: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      destination: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      currentLocation: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      events: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      estimatedDelivery: {
        type: DataTypes.DATE,
        allowNull: true
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      }
    }, {
      tableName: 'delivery_tracking',
      timestamps: true,
      indexes: [
        { fields: ['trackingNumber'] },
        { fields: ['orderId'] },
        { fields: ['partnerId'] },
        { fields: ['status'] }
      ]
    });

    return DeliveryTracking;
  }
};
