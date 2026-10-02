const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Review = sequelize.define('Review', {
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
      orderId: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      userId: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      userName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 5 }
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: true
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      images: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      helpfulCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      verifiedPurchase: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
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
      tableName: 'reviews',
      timestamps: true,
      indexes: [
        { fields: ['productId', 'status'] },
        { fields: ['userId'] },
        { fields: ['orderId'] },
        { fields: ['rating'] }
      ]
    });

    return Review;
  }
};
