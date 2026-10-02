const { DataTypes } = require('sequelize');

module.exports = {
  init: (sequelize) => {
    const Conversation = sequelize.define('Conversation', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      participantIds: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        validate: {
          hasParticipants(value) {
            if (!Array.isArray(value) || value.length < 2) {
              throw new Error('Conversation must have at least two participants');
            }
          }
        }
      },
      participantHash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      participantProfiles: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      lastMessageId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      lastMessageSnapshot: {
        type: DataTypes.JSONB,
        defaultValue: null
      },
      lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      unreadCounts: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      status: {
        type: DataTypes.ENUM('active', 'archived', 'closed'),
        defaultValue: 'active'
      },
      createdBy: {
        type: DataTypes.STRING(128),
        allowNull: true
      }
    }, {
      tableName: 'conversations',
      timestamps: true,
      indexes: [
        { fields: ['participantHash'] },
        { fields: ['orderId'] },
        { unique: true, fields: ['participantHash', 'orderId'] }
      ]
    });

    return Conversation;
  }
};
