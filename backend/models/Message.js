const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Message = sequelize.define('Message', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      conversationId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      senderId: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('text', 'image', 'file', 'system'),
        defaultValue: 'text'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      attachments: {
        type: DataTypes.JSONB,
        defaultValue: null
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      status: {
        type: DataTypes.ENUM('sent', 'delivered', 'read'),
        defaultValue: 'sent'
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'messages',
      timestamps: true,
      indexes: [
        { fields: ['conversationId'] },
        { fields: ['senderId'] }
      ]
    });

    return Message;
  }
};
