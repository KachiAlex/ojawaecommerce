import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import apiService from '../services/apiService';
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
      const userId = currentUser.uid || currentUser.id;
      if (!userId) {
        console.warn('No user ID available for fetching notifications');
        return;
      }
      const userNotifications = await apiService.notifications.getByUser(
        userId,
        { limit: NOTIFICATION_LIMIT }
      );
      setNotifications(userNotifications);
      
      // Count unread notifications
      const unread = userNotifications.filter(n => !n.read && !n.isRead).length;
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
      await apiService.notifications.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true, isRead: true } : n
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
      const userId = currentUser.uid || currentUser.id;
      if (!userId) {
        console.warn('No user ID available for marking notifications as read');
        return;
      }
      await apiService.notifications.markAllAsRead(userId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, isRead: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Create new notification
  const createNotification = async (notificationData) => {
    try {
      const userId = currentUser.uid || currentUser.id;
      if (!userId) {
        console.warn('No user ID available for creating notification');
        throw new Error('No user ID available');
      }
      const notification = await apiService.notifications.create({
        ...notificationData,
        userId: userId
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
      await apiService.notifications.delete(notificationId);
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if notification was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Listen for real-time notifications
  useEffect(() => {
    if (!currentUser || !isPageVisible) return;

    const userId = currentUser.uid || currentUser.id;
    if (!userId) {
      console.warn('No user ID available for notification listener');
      return;
    }

    const unsubscribe = apiService.notifications.listenToUserNotifications(
      userId,
      (newNotifications) => {
        setNotifications(newNotifications);
        
        // Count unread notifications
        const unread = newNotifications.filter(n => !n.read && !n.isRead).length;
        setUnreadCount(unread);
      },
      { interval: 30000, limit: NOTIFICATION_LIMIT }
    );

    return () => unsubscribe();
  }, [currentUser, isPageVisible]);

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read if not already read
    if (!notification.read && !notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Handle different notification types
    const nType = notification.type || ''
    switch (nType) {
      case 'new_order':
        window.location.href = '/vendor?tab=orders';
        break;
      case 'order_placed':
      case 'order_shipped':
      case 'order_delivered':
      case 'order_cancelled':
      case 'order_update':
        window.location.href = '/enhanced-buyer?tab=orders';
        break;
      case 'payment_received':
      case 'payment_released':
      case 'wallet_funded':
        window.location.href = '/enhanced-buyer?tab=wallet';
        break;
      case 'return_requested':
      case 'return_update':
        window.location.href = '/enhanced-buyer?tab=orders';
        break;
      case 'message_received':
        window.location.href = '/messages';
        break;
      default:
        window.location.href = '/enhanced-buyer';
    }
  };

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    fetchNotifications,
    handleNotificationClick
  }), [notifications, unreadCount, loading]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;