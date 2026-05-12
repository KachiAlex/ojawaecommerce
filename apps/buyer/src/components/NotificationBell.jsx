import { useState, useEffect, useRef } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import MobileTouchButton from './MobileTouchButton'
import NotificationCenter from './NotificationCenter'
import { deviceDetection } from '../utils/mobileUtils'

const NotificationBell = ({ className = '', size = 'md' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const { unreadCount, isInitialized, permission, requestPermission } = useNotifications()
  const bellRef = useRef(null)

  // Show pulse animation for new notifications
  useEffect(() => {
    if (unreadCount > 0) {
      setShowPulse(true)
      const timer = setTimeout(() => setShowPulse(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [unreadCount])

  // Handle permission request
  const handlePermissionRequest = async () => {
    if (permission === 'default') {
      const granted = await requestPermission()
      if (granted) {
        // Show success message
        console.log('Notification permission granted')
      }
    }
  }

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8 text-lg'
      case 'lg':
        return 'w-12 h-12 text-2xl'
      case 'xl':
        return 'w-16 h-16 text-3xl'
      default:
        return 'w-10 h-10 text-xl'
    }
  }

  // Get badge size classes
  const getBadgeSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4 text-xs -top-1 -right-1'
      case 'lg':
        return 'h-6 w-6 text-sm -top-1 -right-1'
      case 'xl':
        return 'h-8 w-8 text-base -top-2 -right-2'
      default:
        return 'h-5 w-5 text-xs -top-1 -right-1'
    }
  }

  const isMobile = deviceDetection.isMobile()

  return (
    <>
      <div className={`relative ${className}`} ref={bellRef}>
        <MobileTouchButton
          variant="ghost"
          size={size}
          onClick={() => setIsOpen(true)}
          className={`relative ${getSizeClasses()} ${
            showPulse ? 'animate-pulse' : ''
          }`}
          haptic={true}
        >
          {/* Bell Icon */}
          <span className={`${showPulse ? 'animate-bounce' : ''}`}>
            🔔
          </span>

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <span className={`absolute bg-red-500 text-white rounded-full flex items-center justify-center font-medium ${getBadgeSizeClasses()}`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          {/* Permission Request Badge */}
          {!isInitialized && permission === 'default' && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></span>
          )}
        </MobileTouchButton>

        {/* Permission Request Tooltip */}
        {!isInitialized && permission === 'default' && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-50">
            <div className="flex items-center space-x-2">
              <span>🔔</span>
              <span>Enable notifications for updates</span>
            </div>
            <div className="mt-2">
              <MobileTouchButton
                variant="primary"
                size="xs"
                onClick={handlePermissionRequest}
                className="w-full"
              >
                Enable
              </MobileTouchButton>
            </div>
            {/* Arrow */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        )}
      </div>

      {/* Notification Center Modal */}
      <NotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

// Notification Dropdown (for desktop)
export const NotificationDropdown = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const { unreadCount, notifications, markAsRead, handleNotificationClick } = useNotifications()
  const dropdownRef = useRef(null)

  // Show pulse animation for new notifications
  useEffect(() => {
    if (unreadCount > 0) {
      setShowPulse(true)
      const timer = setTimeout(() => setShowPulse(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [unreadCount])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get recent notifications (last 5)
  const recentNotifications = notifications.slice(0, 5)

  // Format notification time
  const formatTime = (timestamp) => {
    const now = new Date()
    const notificationTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return notificationTime.toLocaleDateString()
  }

  // Get notification icon
  const getNotificationIcon = (type) => {
    const icons = {
      'order_update': '📦',
      'payment_success': '✅',
      'payment_failed': '❌',
      'shipment_update': '🚚',
      'delivery_confirmation': '🏠',
      'dispute_alert': '⚠️',
      'promotional': '🎉',
      'system_alert': '🔔',
      'wallet_update': '💰'
    }
    return icons[type] || '🔔'
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <MobileTouchButton
        variant="ghost"
        size="md"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 ${
          showPulse ? 'animate-pulse' : ''
        }`}
      >
        <span className={`text-xl ${showPulse ? 'animate-bounce' : ''}`}>
          🔔
        </span>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </MobileTouchButton>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="text-2xl mb-2">🔔</div>
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id)
                      }
                      handleNotificationClick(notification)
                      setIsOpen(false)
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                        <p className={`text-sm mt-1 ${
                          !notification.isRead ? 'text-gray-800' : 'text-gray-600'
                        }`}>
                          {notification.body}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <MobileTouchButton
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsOpen(false)
                // Open full notification center
                window.location.href = '/notifications'
              }}
            >
              View All Notifications
            </MobileTouchButton>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
