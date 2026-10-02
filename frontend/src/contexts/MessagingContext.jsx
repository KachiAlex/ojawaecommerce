import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import apiService from '../services/apiService';
import pushService from '../services/pushService';
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
  const [pushToken, setPushToken] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const CONVERSATION_LIMIT = 20;
  const MESSAGE_LIMIT = 40;

  const getUnreadForCurrentUser = useCallback((conversation) => {
    const rawUnread = conversation.unreadCount;
    if (typeof rawUnread === 'number') return rawUnread;
    if (rawUnread && typeof rawUnread === 'object') {
      const userId = currentUser?.uid || currentUser?.id;
      return rawUnread[userId] || 0;
    }
    return 0;
  }, [currentUser?.uid, currentUser?.id]);

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
  const fetchConversations = useCallback(async () => {
    if (!currentUser || !isPageVisible) {
      setLoading(false);
      return undefined;
    }
    
    try {
      setLoading(true);
      const userId = currentUser.uid || currentUser.id;
      if (!userId) {
        console.warn('No user ID available for fetching conversations');
        setLoading(false);
        return undefined;
      }
      const userConversations = await apiService.messaging.getUserConversations(
        userId,
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
  }, [currentUser, isPageVisible, normalizeConversations]);

  // Start a new conversation
  const startConversation = useCallback(async (otherUserId, orderId = null) => {
    try {
      const userId = currentUser.uid || currentUser.id;
      if (!userId) {
        console.warn('No user ID available for starting conversation');
        throw new Error('No user ID available');
      }
      const conversation = await apiService.messaging.getOrCreateConversation(
        userId,
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
  }, [currentUser, getConversationKey, getUnreadForCurrentUser]);

  // Send a message (accepts both object and positional args)
  const sendMessage = useCallback(async (conversationIdOrObj, contentArg, typeArg = 'text') => {
    try {
      const userId = currentUser.uid || currentUser.id;
      if (!userId) {
        console.warn('No user ID available for sending message');
        throw new Error('No user ID available');
      }
      let conversationId, content, type;
      if (typeof conversationIdOrObj === 'object' && conversationIdOrObj !== null) {
        conversationId = conversationIdOrObj.conversationId;
        content = conversationIdOrObj.content;
        type = conversationIdOrObj.type || 'text';
      } else {
        conversationId = conversationIdOrObj;
        content = contentArg;
        type = typeArg;
      }
      const message = await apiService.messaging.sendMessage({
        conversationId,
        senderId: userId,
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
  }, [currentUser]);

  // Mark conversation as read (accepts conversation object or ID)
  const markAsRead = useCallback(async (conversationOrId) => {
    try {
      const userId = currentUser.uid || currentUser.id;
      if (!userId) {
        console.warn('No user ID available for marking as read');
        return;
      }
      const conversationIds = (function() {
        if (typeof conversationOrId === 'string') return [conversationOrId];
        if (conversationOrId?.relatedConversationIds?.length) return conversationOrId.relatedConversationIds;
        if (conversationOrId?.id) return [conversationOrId.id];
        return [activeConversation?.id].filter(Boolean);
      })();
      
      await Promise.all(
        conversationIds.map(id => apiService.messaging.markAsRead(id, userId))
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
  }, [currentUser, activeConversation]);

  // Listen to real-time messages
  useEffect(() => {
    if (!currentUser || !activeConversation || !isPageVisible) return;

    const conversationIds = (activeConversation.relatedConversationIds?.length
      ? activeConversation.relatedConversationIds
      : [activeConversation.id]).filter(Boolean);

    if (conversationIds.length === 0) return;

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
      apiService.messaging.listenToMessages(
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
    
    const userId = currentUser.uid || currentUser.id;
    if (!userId) {
      console.warn('No user ID available for conversation listener');
      setLoading(false);
      return;
    }
    
    const unsubscribe = apiService.messaging.listenToUserConversations(
      userId,
      (newConversations) => {
        const normalized = normalizeConversations(newConversations);
        setConversations(normalized);
        
        const unread = normalized.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
        setUnreadCount(unread);
        
        setLoading(false);
      },
      { interval: 30000, limit: CONVERSATION_LIMIT }
    );

    return () => unsubscribe();
  }, [currentUser, normalizeConversations, isPageVisible]);

  // Keep active conversation reference in sync with normalized list
  useEffect(() => {
    if (!activeConversation) return;
    const ids = activeConversation.relatedConversationIds || [activeConversation.id];
    const updated = conversations.find(conv => conv.relatedConversationIds?.some(id => ids.includes(id)));
    if (updated && updated.id !== activeConversation.id) {
      setActiveConversation(updated);
    }
  }, [conversations]);

  // Note: Removed duplicate fetchConversations() call since real-time listener handles it

  // Initialize FCM when user logs in
  useEffect(() => {
    if (!currentUser) return;

    const initFCM = async () => {
      try {
        const userId = currentUser.uid || currentUser.id;
        if (!userId) {
          console.warn('No user ID available for FCM initialization');
          return;
        }
        console.log('Initializing FCM for user:', userId);
        
        // Initialize FCM and get token
        const token = await pushService.initializePush(userId);
        
        if (token) {
          setPushToken(token);
          console.log('FCM initialized successfully');
        } else {
          console.log('FCM not available (disabled or not supported)');
        }
        
        // Update permission status
        setNotificationPermission(pushService.getPermissionStatus());
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
      if (pushToken && currentUser) {
        const userId = currentUser.uid || currentUser.id;
        if (userId) {
          pushService.removePushToken(userId).catch(console.error);
        }
      }
    };
  }, [currentUser?.uid, currentUser?.id]);

  // Handle foreground messages
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = pushService.handleForegroundMessage((payload) => {
      console.log('Foreground message received:', payload);
      
      // The notification will be shown by the browser's native notification
      // We don't need to show it in-app here to avoid duplication
      // The NotificationContext will pick it up from Firestore listener
    });

    return unsubscribe;
  }, [currentUser]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    try {
      const granted = await pushService.requestNotificationPermission();
      setNotificationPermission(pushService.getPermissionStatus());
      
      if (granted && currentUser) {
        // Get and save FCM token
        const userId = currentUser.uid || currentUser.id;
        if (userId) {
          const token = await pushService.getPushToken(userId);
          setPushToken(token);
        }
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [currentUser]);

  const value = useMemo(() => ({
    conversations,
    activeConversation,
    messages,
    loading,
    unreadCount,
    pushToken,
    notificationPermission,
    setActiveConversation,
    startConversation,
    sendMessage,
    markAsRead,
    fetchConversations,
    requestNotificationPermission
  }), [conversations, activeConversation, messages, loading, unreadCount, pushToken, notificationPermission, startConversation, sendMessage, markAsRead, fetchConversations, requestNotificationPermission]);

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};

export default MessagingContext;
