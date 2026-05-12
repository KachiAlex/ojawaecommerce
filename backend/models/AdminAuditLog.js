const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const AdminAuditLog = sequelize.define('AdminAuditLog', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      adminId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      adminEmail: {
        type: DataTypes.STRING,
        allowNull: false
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false
      },
      targetUserId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      targetUserEmail: {
        type: DataTypes.STRING,
        allowNull: true
      },
      targetProductId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      productName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      vendorId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      oldStatus: {
        type: DataTypes.STRING,
        allowNull: true
      },
      newStatus: {
        type: DataTypes.STRING,
        allowNull: true
      },
      reason: {
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
      tableName: 'admin_audit_logs',
      timestamps: true,
      updatedAt: false
    });

    return AdminAuditLog;
  }
};
