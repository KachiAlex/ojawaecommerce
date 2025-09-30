import { useState, useEffect, useCallback } from 'react'
import { useNotifications } from '../contexts/NotificationContext'
import { NOTIFICATION_TYPES } from '../services/notificationService'
import MobileTouchButton from './MobileTouchButton'
import { deviceDetection } from '../utils/mobileUtils'

const NotificationToast = ({ notification, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isExiting, setIsExiting] = useState(false)
  const { markAsRead, handleNotificationClick } = useNotifications()

  // Auto-hide timer
  useEffect(() => {
    if (notification.priority === 'urgent') return // Don't auto-hide urgent notifications

    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, notification.priority])

  // Handle close
  const handleClose = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 300)
  }, [onClose])

  // Handle click
  const handleClick = useCallback(() => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    handleNotificationClick(notification)
    handleClose()
  }, [notification, markAsRead, handleNotificationClick, handleClose])

  // Get notification icon
  const getNotificationIcon = (type) => {
    const icons = {
      [NOTIFICATION_TYPES.ORDER_UPDATE]: '📦',
      [NOTIFICATION_TYPES.PAYMENT_SUCCESS]: '✅',
      [NOTIFICATION_TYPES.PAYMENT_FAILED]: '❌',
      [NOTIFICATION_TYPES.SHIPMENT_UPDATE]: '🚚',
      [NOTIFICATION_TYPES.DELIVERY_CONFIRMATION]: '🏠',
      [NOTIFICATION_TYPES.DISPUTE_ALERT]: '⚠️',
      [NOTIFICATION_TYPES.PROMOTIONAL]: '🎉',
      [NOTIFICATION_TYPES.SYSTEM_ALERT]: '🔔',
      [NOTIFICATION_TYPES.WALLET_UPDATE]: '💰',
      [NOTIFICATION_TYPES.VENDOR_APPROVAL]: '👤',
      [NOTIFICATION_TYPES.LOGISTICS_UPDATE]: '📋'
    }
    return icons[type] || '🔔'
  }

  // Get notification color
  const getNotificationColor = (type, priority) => {
    if (priority === 'urgent' || type === NOTIFICATION_TYPES.DISPUTE_ALERT) {
      return 'border-red-200 bg-red-50'
    }
    if (priority === 'high' || type === NOTIFICATION_TYPES.ORDER_UPDATE) {
      return 'border-blue-200 bg-blue-50'
    }
    if (type === NOTIFICATION_TYPES.PAYMENT_SUCCESS) {
      return 'border-green-200 bg-green-50'
    }
    if (type === NOTIFICATION_TYPES.PAYMENT_FAILED) {
      return 'border-red-200 bg-red-50'
    }
    if (type === NOTIFICATION_TYPES.PROMOTIONAL) {
      return 'border-purple-200 bg-purple-50'
    }
    return 'border-gray-200 bg-white'
  }

  // Get action buttons
  const getActionButtons = (type, data) => {
    const actions = []

    switch (type) {
      case NOTIFICATION_TYPES.ORDER_UPDATE:
        if (data.orderId) {
          actions.push({
            label: 'View Order',
            action: () => window.location.href = `/orders/${data.orderId}`
          })
        }
        break
      case NOTIFICATION_TYPES.PAYMENT_SUCCESS:
        actions.push({
          label: 'View Receipt',
          action: () => window.location.href = '/buyer'
        })
        break
      case NOTIFICATION_TYPES.SHIPMENT_UPDATE:
        if (data.orderId) {
          actions.push({
            label: 'Track Order',
            action: () => window.location.href = `/tracking/${data.orderId}`
          })
        }
        break
      case NOTIFICATION_TYPES.DISPUTE_ALERT:
        actions.push({
          label: 'Resolve',
          action: () => window.location.href = '/buyer?tab=disputes'
        })
        break
    }

    return actions
  }

  const actions = getActionButtons(notification.type, notification.data)
  const isMobile = deviceDetection.isMobile()

  if (!isVisible) return null

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full mx-4 transform transition-all duration-300 ${
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      } ${isMobile ? 'max-w-full' : ''}`}
    >
      <div
        className={`rounded-lg shadow-lg border p-4 cursor-pointer hover:shadow-xl transition-shadow ${
          getNotificationColor(notification.type, notification.priority)
        }`}
        onClick={handleClick}
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 text-2xl">
            {getNotificationIcon(notification.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">
                {notification.title}
              </h4>
              <div className="flex items-center space-x-2">
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClose()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-1">
              {notification.body}
            </p>

            {/* Priority indicator */}
            {notification.priority === 'urgent' && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  🔥 Urgent
                </span>
              </div>
            )}

            {/* Action buttons */}
            {actions.length > 0 && (
              <div className="mt-3 flex space-x-2">
                {actions.map((action, index) => (
                  <MobileTouchButton
                    key={index}
                    variant="primary"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      action.action()
                      handleClose()
                    }}
                    className="text-xs"
                  >
                    {action.label}
                  </MobileTouchButton>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Toast Container
export const NotificationToastContainer = () => {
  const [toasts, setToasts] = useState([])
  const { notifications } = useNotifications()

  // Show toast for new notifications
  useEffect(() => {
    const newNotifications = notifications.filter(n => 
      !n.isRead && 
      new Date(n.createdAt.toDate ? n.createdAt.toDate() : n.createdAt) > new Date(Date.now() - 10000) // Last 10 seconds
    )

    newNotifications.forEach(notification => {
      // Check if toast already exists
      if (!toasts.find(t => t.id === notification.id)) {
        setToasts(prev => [...prev, notification])
      }
    })
  }, [notifications, toasts])

  // Remove toast
  const removeToast = useCallback((notificationId) => {
    setToasts(prev => prev.filter(t => t.id !== notificationId))
  }, [])

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          notification={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

export default NotificationToast
