const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Notification = sequelize.define('Notification', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      type: {
        type: DataTypes.ENUM('order', 'payment', 'product', 'system', 'promotion'),
        allowNull: false
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      data: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
      tableName: 'notifications',
      timestamps: true
    });

    return Notification;
  }
};
