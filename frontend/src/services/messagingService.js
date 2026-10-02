import apiService from './apiService';

// Lightweight wrapper that delegates messaging operations to the REST-backed apiService
export const messagingService = {
  buildConversationKey(participants = []) {
    return (participants || [])
      .filter(Boolean)
      .map(String)
      .sort((a, b) => a.localeCompare(b))
      .join('__');
  },

  createConversation(conversationData) {
    return apiService.messaging.createConversation(conversationData);
  },

  getUserConversations(userId, options = {}) {
    return apiService.messaging.getUserConversations(userId, options);
  },

  listenToUserConversations(userId, callback, options = {}) {
    return apiService.messaging.listenToUserConversations(userId, callback, options);
  },

  sendMessage(messageData) {
    return apiService.messaging.sendMessage(messageData);
  },

  getConversationMessages(conversationId, options = {}) {
    return apiService.messaging.listenToMessages(conversationId, () => {}, options)
      ? apiService.messaging.listenToMessages(conversationId, () => {}, options)
      : apiService.messaging.listenToMessages(conversationId, () => {}, options);
  },

  listenToMessages(conversationId, callback, options = {}) {
    return apiService.messaging.listenToMessages(conversationId, callback, options);
  },

  markAsRead(conversationId, userId) {
    return apiService.messaging.markAsRead(conversationId, userId);
  },

  getOrCreateConversation(userId1, userId2, orderId = null) {
    return apiService.messaging.getOrCreateConversation(userId1, userId2, orderId);
  },

  sendFileMessage(conversationId, file, senderId) {
    return apiService.messaging.sendFileMessage(conversationId, file, senderId);
  },

  getConversationByOrder(orderId) {
    return apiService.messaging.getConversationByOrder ? apiService.messaging.getConversationByOrder(orderId) : null;
  },

  deleteConversation(conversationId) {
    return apiService.messaging.deleteConversation ? apiService.messaging.deleteConversation(conversationId) : null;
  }
};

export default messagingService;
export default messagingService;
