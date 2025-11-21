import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs,
  serverTimestamp,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Messaging service for buyer-vendor communication
export const messagingService = {
  // Create a new conversation
  async createConversation(conversationData) {
    try {
      const docRef = await addDoc(collection(db, 'conversations'), {
        ...conversationData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: 0
      });
      
      return {
        id: docRef.id,
        ...conversationData
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  // Get user's conversations
  async getUserConversations(userId) {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user conversations:', error);
      throw error;
    }
  },

  // Listen to user's conversations in real-time
  listenToUserConversations(userId, callback) {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );
      
      return onSnapshot(q, (snapshot) => {
        const conversations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(conversations);
      });
    } catch (error) {
      console.error('Error setting up conversations listener:', error);
      throw error;
    }
  },

  // Send a message
  async sendMessage(messageData) {
    try {
      const docRef = await addDoc(collection(db, 'messages'), {
        ...messageData,
        timestamp: serverTimestamp(),
        read: false
      });
      
      // Update conversation's last message and timestamp
      await updateDoc(doc(db, 'conversations', messageData.conversationId), {
        lastMessage: {
          content: messageData.content,
          type: messageData.type,
          senderId: messageData.senderId,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...messageData
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Get messages for a conversation
  async getConversationMessages(conversationId, options = {}) {
    try {
      const { limit: messageLimit = 50, orderBy: orderByField = 'timestamp', orderDirection = 'desc' } = options;
      
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy(orderByField, orderDirection),
        limit(messageLimit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  },

  // Listen to messages in real-time
  listenToMessages(conversationId, callback, options = {}) {
    try {
      const { limit: messageLimit = 50, orderBy: orderByField = 'timestamp', orderDirection = 'desc' } = options;
      
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy(orderByField, orderDirection),
        limit(messageLimit)
      );
      
      return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(messages);
      });
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      throw error;
    }
  },

  // Mark conversation as read
  async markAsRead(conversationId, userId) {
    try {
      // Update unread count for the user
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        [`unreadCount.${userId}`]: 0,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  },

  // Get or create conversation between two users
  async getOrCreateConversation(userId1, userId2, orderId = null) {
    try {
      // First, try to find existing conversation
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId1)
      );
      
      const snapshot = await getDocs(q);
      const existingConversation = snapshot.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(userId2);
      });
      
      if (existingConversation) {
        return {
          id: existingConversation.id,
          ...existingConversation.data()
        };
      }
      
      // Create new conversation if none exists
      return await this.createConversation({
        participants: [userId1, userId2],
        orderId,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      throw error;
    }
  },

  // Send file attachment
  async sendFileMessage(conversationId, file, senderId) {
    try {
      // Upload file to Firebase Storage
      const fileName = `messages/${conversationId}/${Date.now()}-${file.name}`;
      const downloadURL = await firebaseService.storage.uploadFile(file, fileName);
      
      // Create message with file attachment
      return await this.sendMessage({
        conversationId,
        senderId,
        content: downloadURL,
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 'file',
        fileName: file.name,
        fileSize: file.size,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending file message:', error);
      throw error;
    }
  },

  // Get conversation by order ID
  async getConversationByOrder(orderId) {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('orderId', '==', orderId)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error fetching conversation by order:', error);
      throw error;
    }
  },

  // Delete conversation
  async deleteConversation(conversationId) {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        deleted: true,
        deletedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
};

export default messagingService;
