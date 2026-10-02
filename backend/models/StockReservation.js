const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const StockReservation = sequelize.define('StockReservation', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'products', key: 'id' }
      },
      userId: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 }
      },
      orderId: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('active', 'converted', 'expired', 'cancelled'),
        defaultValue: 'active'
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
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
      tableName: 'stock_reservations',
      timestamps: true,
      indexes: [
        { fields: ['productId', 'status'] },
        { fields: ['userId', 'status'] },
        { fields: ['expiresAt'] },
        { fields: ['orderId'] }
      ]
    });

    return StockReservation;
  }
};
