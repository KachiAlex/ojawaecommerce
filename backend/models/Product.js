const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Product = sequelize.define('Product', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      vendorId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: DataTypes.TEXT,
      category: DataTypes.STRING,
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      stockQuantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      images: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      thumbnail: DataTypes.STRING,
      specifications: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'out_of_stock'),
        defaultValue: 'pending'
      },
      views: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lastViewedAt: DataTypes.DATE,
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'products',
      timestamps: true
    });

    return Product;
  }
};
