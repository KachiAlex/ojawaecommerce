const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const User = sequelize.define('User', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM('buyer', 'vendor', 'admin', 'logistics'),
        defaultValue: 'buyer',
        allowNull: false
      },
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      phoneNumber: DataTypes.STRING,
      profile: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      isEmailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
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
      tableName: 'users',
      timestamps: true
    });

    return User;
  }
};
