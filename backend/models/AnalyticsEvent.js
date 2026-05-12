const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const AnalyticsEvent = sequelize.define('AnalyticsEvent', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      category: {
        type: DataTypes.STRING,
        defaultValue: 'general'
      },
      action: {
        type: DataTypes.STRING,
        allowNull: true
      },
      label: {
        type: DataTypes.STRING,
        allowNull: true
      },
      value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'analytics_events',
      timestamps: true,
      updatedAt: false
    });

    return AnalyticsEvent;
  }
};
