const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Vendor = sequelize.define('Vendor', {
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
      storeName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      storeDescription: DataTypes.TEXT,
      logo: DataTypes.STRING,
      banner: DataTypes.STRING,
      businessEmail: DataTypes.STRING,
      businessPhone: DataTypes.STRING,
      businessAddress: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0
      },
      totalReviews: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      isApproved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
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
      tableName: 'vendors',
      timestamps: true
    });

    return Vendor;
  }
};
