const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const PromoCampaign = sequelize.define('PromoCampaign', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'paused', 'ended'),
        defaultValue: 'draft'
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      discountConfig: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      vendorIds: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      productIds: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      createdBy: {
        type: DataTypes.STRING(128),
        allowNull: true
      }
    }, {
      tableName: 'promo_campaigns',
      timestamps: true
    });

    return PromoCampaign;
  }
};
