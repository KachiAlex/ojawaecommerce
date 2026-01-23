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
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import firebaseService from './firebaseService';

// Messaging service for buyer-vendor communication
export const messagingService = {
  buildConversationKey(participants = []) {
    return (participants || [])
      .filter(Boolean)
      .map(String)
      .sort((a, b) => a.localeCompare(b))
      .join('__');
  },

  // Create a new conversation
  async createConversation(conversationData) {
    try {
      const sortedParticipants = (conversationData.participants || [])
        .filter(Boolean)
        .map(String)
        .sort((a, b) => a.localeCompare(b));
      const conversationKey = this.buildConversationKey(sortedParticipants);
      const docRef = await addDoc(collection(db, 'conversations'), {
        ...conversationData,
        participants: sortedParticipants,
        conversationKey,
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
  async getUserConversations(userId, options = {}) {
    try {
      const { limit: conversationLimit = 50 } = options;
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc'),
        limit(conversationLimit)
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
  listenToUserConversations(userId, callback, options = {}) {
    try {
      const { limit: conversationLimit = 50 } = options;
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc'),
        limit(conversationLimit)
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
      const batch = writeBatch(db);
      const messageRef = doc(collection(db, 'messages'));
      const timestamp = serverTimestamp();
      
      batch.set(messageRef, {
        ...messageData,
        timestamp,
        read: false
      });

      const conversationRef = doc(db, 'conversations', messageData.conversationId);
      batch.update(conversationRef, {
        lastMessage: {
          content: messageData.content,
          type: messageData.type,
          senderId: messageData.senderId,
          timestamp
        },
        updatedAt: timestamp
      });

      await batch.commit();
      
      return {
        id: messageRef.id,
        ...messageData,
        timestamp: messageData.timestamp || new Date()
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
      const participants = [userId1, userId2].filter(Boolean).map(String);
      const conversationKey = this.buildConversationKey(participants);

      if (conversationKey) {
        try {
          const exactQuery = query(
            collection(db, 'conversations'),
            where('conversationKey', '==', conversationKey),
            limit(1)
          );
          const exactSnapshot = await getDocs(exactQuery);
          if (!exactSnapshot.empty) {
            const docSnap = exactSnapshot.docs[0];
            return {
              id: docSnap.id,
              ...docSnap.data()
            };
          }
        } catch (keyLookupError) {
          console.warn('Conversation key lookup failed, falling back to legacy query:', keyLookupError?.message);
        }
      }

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
        participants,
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
