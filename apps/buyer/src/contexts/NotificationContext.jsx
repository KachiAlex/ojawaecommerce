import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import firebaseService from '../services/firebaseService';

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
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications for current user
  const fetchNotifications = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const userNotifications = await firebaseService.notifications.getByUser(currentUser.uid);
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
    if (!currentUser) return;

    const unsubscribe = firebaseService.notifications.listenToUserNotifications(
      currentUser.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        
        // Count unread notifications
        const unread = newNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [currentUser]);

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
    fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;