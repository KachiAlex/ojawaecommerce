const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const LogisticsRoute = sequelize.define('LogisticsRoute', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      logisticsPartnerId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      routeType: {
        type: DataTypes.ENUM('intracity', 'intercity', 'international'),
        allowNull: false,
        defaultValue: 'intracity'
      },
      country: DataTypes.STRING,
      state: DataTypes.STRING,
      city: DataTypes.STRING,
      stateAsCity: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      from: DataTypes.STRING,
      to: DataTypes.STRING,
      distance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: 'NGN'
      },
      estimatedTime: DataTypes.STRING,
      vehicleType: {
        type: DataTypes.STRING,
        defaultValue: 'Van'
      },
      serviceType: {
        type: DataTypes.STRING,
        defaultValue: 'Standard Delivery'
      },
      ratePerKm: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 50
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'draft'),
        defaultValue: 'active'
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
      tableName: 'logistics_routes',
      timestamps: true
    });

    return LogisticsRoute;
  }
};
