const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const EmailLog = sequelize.define('EmailLog', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      recipient: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING(64),
        defaultValue: 'general'
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('queued', 'sent', 'failed'),
        defaultValue: 'queued'
      },
      messageId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      data: {
        type: DataTypes.JSONB,
        defaultValue: {}
      }
    }, {
      tableName: 'email_logs',
      timestamps: true,
      indexes: [
        { fields: ['userId'] },
        { fields: ['status'] }
      ]
    });

    return EmailLog;
  }
};
