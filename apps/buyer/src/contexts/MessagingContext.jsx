import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import firebaseService from '../services/firebaseService';
import fcmService from '../services/fcmService';
import { usePageVisibility } from '../hooks/usePageVisibility';

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
  const isPageVisible = usePageVisibility();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const CONVERSATION_LIMIT = 20;
  const MESSAGE_LIMIT = 40;

  const getUnreadForCurrentUser = useCallback((conversation) => {
    if (!conversation || !currentUser?.uid) return 0;
    const rawUnread = conversation.unreadCount;
    if (typeof rawUnread === 'number') return rawUnread;
    if (rawUnread && typeof rawUnread === 'object') {
      return rawUnread[currentUser.uid] || 0;
    }
    return 0;
  }, [currentUser?.uid]);

  const timestampToDate = (value) => {
    if (!value) return new Date(0);
    if (value.toDate) return value.toDate();
    return new Date(value);
  };

  const getConversationKey = useCallback((participants = []) => {
    return participants.slice().sort().join('__');
  }, []);

  const normalizeConversations = useCallback((rawConversations = []) => {
    const grouped = new Map();

    rawConversations.forEach((conv) => {
      const participants = conv.participants || [];
      const key = getConversationKey(participants);
      const unreadForUser = getUnreadForCurrentUser(conv);
      const timestamp = timestampToDate(conv.updatedAt || conv.lastMessage?.timestamp || conv.createdAt);

      if (!grouped.has(key)) {
        grouped.set(key, {
          latestConversation: conv,
          latestTimestamp: timestamp,
          unread: unreadForUser,
          relatedIds: new Set([conv.id]),
        });
      } else {
        const group = grouped.get(key);
        group.relatedIds.add(conv.id);
        group.unread += unreadForUser;
        if (timestamp > group.latestTimestamp) {
          group.latestConversation = conv;
          group.latestTimestamp = timestamp;
        }
      }
    });

    const normalized = Array.from(grouped.values()).map((group) => ({
      ...group.latestConversation,
      unreadCount: group.unread,
      relatedConversationIds: Array.from(group.relatedIds),
    }));

    return normalized.sort((a, b) => {
      const timeA = timestampToDate(a.updatedAt || a.lastMessage?.timestamp || a.createdAt).getTime();
      const timeB = timestampToDate(b.updatedAt || b.lastMessage?.timestamp || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [getConversationKey, getUnreadForCurrentUser]);

  // Fetch user's conversations
  const fetchConversations = async () => {
    if (!currentUser || !isPageVisible) {
      setLoading(false);
      return undefined;
    }
    
    try {
      setLoading(true);
      const userConversations = await firebaseService.messaging.getUserConversations(
        currentUser.uid,
        { limit: CONVERSATION_LIMIT }
      );
      const normalized = normalizeConversations(userConversations);
      setConversations(normalized);
      
      const unread = normalized.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
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
      const conversation = await firebaseService.messaging.getOrCreateConversation(
        currentUser.uid,
        otherUserId,
        orderId
      );
      
      // Add/update in local state ensuring uniqueness
      setConversations(prev => {
        const key = getConversationKey(conversation.participants || []);
        const existingIndex = prev.findIndex(conv => getConversationKey(conv.participants || []) === key);

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          const updated = [...prev];
          updated[existingIndex] = {
            ...conversation,
            unreadCount: getUnreadForCurrentUser(conversation),
            relatedConversationIds: Array.from(new Set([...(existing.relatedConversationIds || []), conversation.id])),
          };
          return updated;
        }

        return [
          {
            ...conversation,
            unreadCount: getUnreadForCurrentUser(conversation),
            relatedConversationIds: [conversation.id],
          },
          ...prev,
        ];
      });
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
      
      // Don't update local messages here - let the real-time listener handle it
      // This prevents duplicate messages
      
      // Update conversation last message optimistically
      setConversations(prev => 
        prev.map(conv => 
          (conv.relatedConversationIds?.includes(conversationId) || conv.id === conversationId)
            ? { ...conv, lastMessage: message, updatedAt: new Date() }
            : conv
        )
      );
      setUnreadCount(prev => prev); // no change until realtime update

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Mark conversation as read
  const markAsRead = async (conversationRef) => {
    try {
      if (!conversationRef) return;
      const conversationIds = Array.isArray(conversationRef)
        ? conversationRef
        : typeof conversationRef === 'object'
          ? (conversationRef.relatedConversationIds?.length
              ? conversationRef.relatedConversationIds
              : [conversationRef.id])
          : [conversationRef];
      
      await Promise.all(
        conversationIds.map(id => firebaseService.messaging.markAsRead(id, currentUser.uid))
      );
      
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (!conv.relatedConversationIds?.some(id => conversationIds.includes(id))) {
            return conv;
          }
          return { ...conv, unreadCount: 0 };
        });
        const totalUnread = updated.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
        setUnreadCount(totalUnread);
        return updated;
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Listen to real-time messages
  useEffect(() => {
    if (!currentUser || !activeConversation || !isPageVisible) return;

    const conversationIds = (activeConversation.relatedConversationIds?.length
      ? activeConversation.relatedConversationIds
      : [activeConversation.id]).filter(Boolean);

    if (conversationIds.length === 0) return;

    setMessages([]);
    const messagesMap = {};

    const updateCombinedMessages = () => {
      const combined = Object.values(messagesMap)
        .flat()
        .sort((a, b) => {
          const aTime = timestampToDate(a.timestamp).getTime();
          const bTime = timestampToDate(b.timestamp).getTime();
          return aTime - bTime;
        });
      setMessages(combined);
    };

    const unsubscribes = conversationIds.map((id) =>
      firebaseService.messaging.listenToMessages(
        id,
        (newMessages = []) => {
          messagesMap[id] = newMessages;
          updateCombinedMessages();
        },
        { limit: MESSAGE_LIMIT }
      )
    );

    return () => {
      unsubscribes.forEach(unsub => unsub && unsub());
    };
  }, [currentUser, activeConversation, isPageVisible]);

  // Listen to real-time conversations
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    
    const unsubscribe = firebaseService.messaging.listenToUserConversations(
      currentUser.uid,
      (newConversations) => {
        const normalized = normalizeConversations(newConversations);
        setConversations(normalized);
        
        const unread = normalized.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
        setUnreadCount(unread);
        
        setLoading(false);
      },
      { limit: CONVERSATION_LIMIT }
    );

    return () => unsubscribe();
  }, [currentUser, normalizeConversations, isPageVisible]);

  // Keep active conversation reference in sync with normalized list
  useEffect(() => {
    if (!activeConversation) return;
    const ids = activeConversation.relatedConversationIds || [activeConversation.id];
    const updated = conversations.find(conv => conv.relatedConversationIds?.some(id => ids.includes(id)));
    if (updated && updated !== activeConversation) {
      setActiveConversation(updated);
    }
  }, [conversations]);

  // Note: Removed duplicate fetchConversations() call since real-time listener handles it

  // Initialize FCM when user logs in
  useEffect(() => {
    if (!currentUser) return;

    const initFCM = async () => {
      try {
        console.log('Initializing FCM for user:', currentUser.uid);
        
        // Initialize FCM and get token
        const token = await fcmService.initializeFCM(currentUser.uid);
        
        if (token) {
          setFcmToken(token);
          console.log('FCM initialized successfully');
        } else {
          console.log('FCM not available (disabled or not supported)');
        }
        
        // Update permission status
        setNotificationPermission(fcmService.getPermissionStatus());
      } catch (error) {
        // Silently handle FCM errors - not critical for app functionality
        console.warn('FCM initialization failed (non-critical):', error.code || error.message);
        
        // Set permission status even on error
        setNotificationPermission('denied');
      }
    };

    // Add a small delay to prevent race conditions
    const timeoutId = setTimeout(initFCM, 100);
    
    // Cleanup on logout
    return () => {
      clearTimeout(timeoutId);
      if (fcmToken && currentUser) {
        fcmService.removeFCMToken(currentUser.uid).catch(console.error);
      }
    };
  }, [currentUser?.uid]);

  // Handle foreground messages
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = fcmService.handleForegroundMessage((payload) => {
      console.log('Foreground message received:', payload);
      
      // The notification will be shown by the browser's native notification
      // We don't need to show it in-app here to avoid duplication
      // The NotificationContext will pick it up from Firestore listener
    });

    return unsubscribe;
  }, [currentUser]);

  // Request notification permission
  const requestNotificationPermission = async () => {
    try {
      const granted = await fcmService.requestNotificationPermission();
      setNotificationPermission(fcmService.getPermissionStatus());
      
      if (granted && currentUser) {
        // Get and save FCM token
        const token = await fcmService.getFCMToken(currentUser.uid);
        setFcmToken(token);
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const value = {
    conversations,
    activeConversation,
    messages,
    loading,
    unreadCount,
    fcmToken,
    notificationPermission,
    setActiveConversation,
    startConversation,
    sendMessage,
    markAsRead,
    fetchConversations,
    requestNotificationPermission
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};

export default MessagingContext;
