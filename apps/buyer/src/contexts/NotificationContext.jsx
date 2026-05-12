import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import firebaseService from '../services/firebaseService';
import { usePageVisibility } from '../hooks/usePageVisibility';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const isPageVisible = usePageVisibility();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const NOTIFICATION_LIMIT = 30;

  // Fetch notifications for current user
  const fetchNotifications = async () => {
    if (!currentUser || !isPageVisible) return;
    
    try {
      setLoading(true);
      const userNotifications = await firebaseService.notifications.getByUser(
        currentUser.uid,
        { limit: NOTIFICATION_LIMIT }
      );
      setNotifications(userNotifications);
      
      // Count unread notifications
      const unread = userNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await firebaseService.notifications.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await firebaseService.notifications.markAllAsRead(currentUser.uid);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Create new notification
  const createNotification = async (notificationData) => {
    try {
      const notification = await firebaseService.notifications.create({
        ...notificationData,
        userId: currentUser.uid,
        createdAt: new Date(),
        read: false
      });
      
      // Add to local state
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await firebaseService.notifications.delete(notificationId);
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if notification was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Listen for real-time notifications
  useEffect(() => {
    if (!currentUser || !isPageVisible) return;

    const unsubscribe = firebaseService.notifications.listenToUserNotifications(
      currentUser.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        
        // Count unread notifications
        const unread = newNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      },
      { limit: NOTIFICATION_LIMIT }
    );

    return () => unsubscribe();
  }, [currentUser, isPageVisible]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [currentUser, isPageVisible]);

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Handle different notification types
    switch (notification.type) {
      case 'new_order':
        // Navigate to vendor dashboard orders tab
        window.location.href = '/vendor?tab=orders';
        break;
      case 'order_update':
        // Navigate to buyer dashboard orders tab
        window.location.href = '/enhanced-buyer?tab=orders';
        break;
      case 'payment_success':
        // Navigate to buyer dashboard
        window.location.href = '/enhanced-buyer';
        break;
      default:
        // Default to buyer dashboard
        window.location.href = '/enhanced-buyer';
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    fetchNotifications,
    handleNotificationClick
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;