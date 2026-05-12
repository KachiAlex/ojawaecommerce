const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const SecurityAuditLog = sequelize.define('SecurityAuditLog', {
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
      eventType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      severity: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'low'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
      },
      userAgent: {
        type: DataTypes.TEXT,
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
      tableName: 'security_audit_logs',
      timestamps: true,
      updatedAt: false
    });

    return SecurityAuditLog;
  }
};
