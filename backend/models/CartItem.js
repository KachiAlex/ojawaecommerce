const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const CartItem = sequelize.define('CartItem', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      cartId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'carts',
          key: 'id'
        }
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        }
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
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
      tableName: 'cart_items',
      timestamps: true
    });

    return CartItem;
  }
};
