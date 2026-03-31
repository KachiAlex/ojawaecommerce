import firebaseService from './firebaseService';

// Lightweight wrapper that delegates messaging operations to the REST-backed firebaseService
export const messagingService = {
  buildConversationKey(participants = []) {
    return (participants || [])
      .filter(Boolean)
      .map(String)
      .sort((a, b) => a.localeCompare(b))
      .join('__');
  },

  createConversation(conversationData) {
    return firebaseService.messaging.createConversation(conversationData);
  },

  getUserConversations(userId, options = {}) {
    return firebaseService.messaging.getUserConversations(userId, options);
  },

  listenToUserConversations(userId, callback, options = {}) {
    return firebaseService.messaging.listenToUserConversations(userId, callback, options);
  },

  sendMessage(messageData) {
    return firebaseService.messaging.sendMessage(messageData);
  },

  getConversationMessages(conversationId, options = {}) {
    return firebaseService.messaging.listenToMessages(conversationId, () => {}, options)
      ? firebaseService.messaging.listenToMessages(conversationId, () => {}, options)
      : firebaseService.messaging.listenToMessages(conversationId, () => {}, options);
  },

  listenToMessages(conversationId, callback, options = {}) {
    return firebaseService.messaging.listenToMessages(conversationId, callback, options);
  },

  markAsRead(conversationId, userId) {
    return firebaseService.messaging.markAsRead(conversationId, userId);
  },

  getOrCreateConversation(userId1, userId2, orderId = null) {
    return firebaseService.messaging.getOrCreateConversation(userId1, userId2, orderId);
  },

  sendFileMessage(conversationId, file, senderId) {
    return firebaseService.messaging.sendFileMessage(conversationId, file, senderId);
  },

  getConversationByOrder(orderId) {
    return firebaseService.messaging.getConversationByOrder ? firebaseService.messaging.getConversationByOrder(orderId) : null;
  },

  deleteConversation(conversationId) {
    return firebaseService.messaging.deleteConversation ? firebaseService.messaging.deleteConversation(conversationId) : null;
  }
};

export default messagingService;
export default messagingService;
