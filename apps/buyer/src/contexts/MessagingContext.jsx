import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import firebaseService from '../services/firebaseService';

const MessagingContext = createContext();

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

export const MessagingProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch user's conversations
  const fetchConversations = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const userConversations = await firebaseService.messaging.getUserConversations(currentUser.uid);
      setConversations(userConversations);
      
      // Calculate unread count
      const unread = userConversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start a new conversation
  const startConversation = async (otherUserId, orderId = null) => {
    try {
      const conversation = await firebaseService.messaging.createConversation({
        participants: [currentUser.uid, otherUserId],
        orderId,
        createdAt: new Date()
      });
      
      // Add to local state
      setConversations(prev => [conversation, ...prev]);
      return conversation;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  };

  // Send a message
  const sendMessage = async (conversationId, content, type = 'text') => {
    try {
      const message = await firebaseService.messaging.sendMessage({
        conversationId,
        senderId: currentUser.uid,
        content,
        type,
        timestamp: new Date()
      });
      
      // Update local messages
      setMessages(prev => [...prev, message]);
      
      // Update conversation last message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, lastMessage: message, updatedAt: new Date() }
            : conv
        )
      );
      
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Mark conversation as read
  const markAsRead = async (conversationId) => {
    try {
      await firebaseService.messaging.markAsRead(conversationId, currentUser.uid);
      
      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      
      // Update unread count
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        setUnreadCount(prev => prev - (conversation.unreadCount || 0));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Listen to real-time messages
  useEffect(() => {
    if (!currentUser || !activeConversation) return;

    const unsubscribe = firebaseService.messaging.listenToMessages(
      activeConversation.id,
      (newMessages) => {
        setMessages(newMessages);
      }
    );

    return () => unsubscribe();
  }, [currentUser, activeConversation]);

  // Listen to real-time conversations
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = firebaseService.messaging.listenToUserConversations(
      currentUser.uid,
      (newConversations) => {
        setConversations(newConversations);
        
        // Calculate unread count
        const unread = newConversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
        setUnreadCount(unread);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [currentUser]);

  const value = {
    conversations,
    activeConversation,
    messages,
    loading,
    unreadCount,
    setActiveConversation,
    startConversation,
    sendMessage,
    markAsRead,
    fetchConversations
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};

export default MessagingContext;
