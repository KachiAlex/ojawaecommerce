const toPlain = (record) => (record && typeof record.toJSON === 'function' ? record.toJSON() : record);

const serializeConversation = (conversation) => {
  const plain = toPlain(conversation) || {};
  return {
    id: plain.id,
    participants: plain.participantIds || [],
    participantProfiles: plain.participantProfiles || [],
    orderId: plain.orderId || null,
    metadata: plain.metadata || {},
    lastMessage: plain.lastMessageSnapshot || null,
    lastMessageAt: plain.lastMessageAt || null,
    unreadCount: plain.unreadCounts || {},
    status: plain.status || 'active',
    createdAt: plain.createdAt || null,
    updatedAt: plain.updatedAt || null
  };
};

const serializeMessage = (message) => {
  const plain = toPlain(message) || {};
  return {
    id: plain.id,
    conversationId: plain.conversationId,
    senderId: plain.senderId,
    type: plain.type,
    content: plain.content,
    attachments: plain.attachments,
    metadata: plain.metadata || {},
    status: plain.status,
    timestamp: plain.sentAt || plain.createdAt || new Date().toISOString(),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};

module.exports = {
  serializeConversation,
  serializeMessage
};
