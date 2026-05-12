const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Cart = sequelize.define('Cart', {
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
      items: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
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
      tableName: 'carts',
      timestamps: true
    });

    return Cart;
  }
};
