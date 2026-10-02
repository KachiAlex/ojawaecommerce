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
        type: DataTypes.STRING(128),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      vendorName: DataTypes.STRING,
      vendorEmail: DataTypes.STRING,
      vendorAddress: DataTypes.STRING,
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: DataTypes.TEXT,
      category: DataTypes.STRING,
      brand: DataTypes.STRING,
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      currency: DataTypes.STRING,
      stockQuantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      // Frontend-facing alias for stockQuantity
      stock: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('stockQuantity');
        }
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
      features: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      tags: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      variants: {
        type: DataTypes.JSONB,
        defaultValue: null
      },
      shipping: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      dimensions: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      sku: DataTypes.STRING,
      weight: DataTypes.DECIMAL(8, 2),
      condition: DataTypes.STRING,
      processingTimeDays: {
        type: DataTypes.INTEGER,
        defaultValue: 2
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'out_of_stock'),
        defaultValue: 'pending'
      },
      featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      views: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lastViewedAt: DataTypes.DATE,
      salesCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0
      },
      reviewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      trackingNumber: DataTypes.STRING,
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
