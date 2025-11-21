import { useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'
import { NOTIFICATION_TYPES } from '../services/notificationService'
import { errorLogger } from '../utils/errorLogger'

// Hook to integrate notifications with order management
export const useOrderNotificationIntegration = () => {
  const { currentUser } = useAuth()
  const { sendNotification, createOrderNotification } = useNotifications()

  // Send order status update notification
  const sendOrderUpdateNotification = useCallback(async (orderId, status, orderData = {}) => {
    if (!currentUser) return

    try {
      const notificationData = createOrderNotification(orderId, status, orderData)
      await sendNotification(notificationData)
      
      errorLogger.info('Order update notification sent', { orderId, status })
    } catch (error) {
      errorLogger.error('Failed to send order update notification', error)
    }
  }, [currentUser, sendNotification, createOrderNotification])

  // Send payment notification
  const sendPaymentNotification = useCallback(async (paymentId, status, amount, currency = 'NGN') => {
    if (!currentUser) return

    try {
      const notificationData = createPaymentNotification(paymentId, status, amount, currency)
      await sendNotification(notificationData)
      
      errorLogger.info('Payment notification sent', { paymentId, status })
    } catch (error) {
      errorLogger.error('Failed to send payment notification', error)
    }
  }, [currentUser, sendNotification])

  // Send shipment notification
  const sendShipmentNotification = useCallback(async (orderId, status, trackingInfo = {}) => {
    if (!currentUser) return

    try {
      const notificationData = {
        title: 'Shipment Update',
        body: `Your order #${orderId.substring(0, 8)} has been ${status}.`,
        type: NOTIFICATION_TYPES.SHIPMENT_UPDATE,
        data: {
          orderId,
          status,
          ...trackingInfo
        },
        priority: 'high',
        channel: 'shipping'
      }

      await sendNotification(notificationData)
      
      errorLogger.info('Shipment notification sent', { orderId, status })
    } catch (error) {
      errorLogger.error('Failed to send shipment notification', error)
    }
  }, [currentUser, sendNotification])

  // Send delivery confirmation notification
  const sendDeliveryNotification = useCallback(async (orderId, deliveryInfo = {}) => {
    if (!currentUser) return

    try {
      const notificationData = {
        title: 'Order Delivered',
        body: `Your order #${orderId.substring(0, 8)} has been delivered. Please confirm receipt.`,
        type: NOTIFICATION_TYPES.DELIVERY_CONFIRMATION,
        data: {
          orderId,
          ...deliveryInfo
        },
        priority: 'high',
        channel: 'shipping'
      }

      await sendNotification(notificationData)
      
      errorLogger.info('Delivery notification sent', { orderId })
    } catch (error) {
      errorLogger.error('Failed to send delivery notification', error)
    }
  }, [currentUser, sendNotification])

  // Send dispute notification
  const sendDisputeNotification = useCallback(async (disputeId, orderId, disputeType, message) => {
    if (!currentUser) return

    try {
      const notificationData = {
        title: 'Dispute Alert',
        body: `A dispute has been opened for order #${orderId.substring(0, 8)}: ${message}`,
        type: NOTIFICATION_TYPES.DISPUTE_ALERT,
        data: {
          disputeId,
          orderId,
          disputeType,
          message
        },
        priority: 'urgent',
        channel: 'disputes'
      }

      await sendNotification(notificationData)
      
      errorLogger.info('Dispute notification sent', { disputeId, orderId })
    } catch (error) {
      errorLogger.error('Failed to send dispute notification', error)
    }
  }, [currentUser, sendNotification])

  return {
    sendOrderUpdateNotification,
    sendPaymentNotification,
    sendShipmentNotification,
    sendDeliveryNotification,
    sendDisputeNotification
  }
}

// Hook to integrate notifications with wallet management
export const useWalletNotificationIntegration = () => {
  const { currentUser } = useAuth()
  const { sendNotification } = useNotifications()

  // Send wallet update notification
  const sendWalletUpdateNotification = useCallback(async (transactionType, amount, currency = 'NGN', balance) => {
    if (!currentUser) return

    try {
      const notificationData = {
        title: 'Wallet Update',
        body: `Your wallet has been ${transactionType === 'credit' ? 'credited' : 'debited'} with ${currency} ${amount.toLocaleString()}. New balance: ${currency} ${balance.toLocaleString()}`,
        type: NOTIFICATION_TYPES.WALLET_UPDATE,
        data: {
          transactionType,
          amount,
          currency,
          balance
        },
        priority: 'normal',
        channel: 'wallet'
      }

      await sendNotification(notificationData)
      
      errorLogger.info('Wallet update notification sent', { transactionType, amount })
    } catch (error) {
      errorLogger.error('Failed to send wallet update notification', error)
    }
  }, [currentUser, sendNotification])

  // Send low balance notification
  const sendLowBalanceNotification = useCallback(async (balance, currency = 'NGN') => {
    if (!currentUser) return

    try {
      const notificationData = {
        title: 'Low Wallet Balance',
        body: `Your wallet balance is low: ${currency} ${balance.toLocaleString()}. Consider topping up.`,
        type: NOTIFICATION_TYPES.WALLET_UPDATE,
        data: {
          balance,
          currency,
          alertType: 'low_balance'
        },
        priority: 'high',
        channel: 'wallet'
      }

      await sendNotification(notificationData)
      
      errorLogger.info('Low balance notification sent', { balance })
    } catch (error) {
      errorLogger.error('Failed to send low balance notification', error)
    }
  }, [currentUser, sendNotification])

  return {
    sendWalletUpdateNotification,
    sendLowBalanceNotification
  }
}

// Hook to integrate notifications with promotional campaigns
export const usePromotionalNotificationIntegration = () => {
  const { currentUser } = useAuth()
  const { sendNotification, createPromotionalNotification } = useNotifications()

  // Send promotional notification
  const sendPromotionalNotification = useCallback(async (title, body, data = {}) => {
    if (!currentUser) return

    try {
      const notificationData = createPromotionalNotification(title, body, data)
      await sendNotification(notificationData)
      
      errorLogger.info('Promotional notification sent', { title })
    } catch (error) {
      errorLogger.error('Failed to send promotional notification', error)
    }
  }, [currentUser, sendNotification, createPromotionalNotification])

  // Send flash sale notification
  const sendFlashSaleNotification = useCallback(async (productName, discount, endTime) => {
    if (!currentUser) return

    try {
      const notificationData = {
        title: '🔥 Flash Sale!',
        body: `${productName} is ${discount}% off! Sale ends in ${endTime}.`,
        type: NOTIFICATION_TYPES.PROMOTIONAL,
        data: {
          productName,
          discount,
          endTime,
          campaignType: 'flash_sale'
        },
        priority: 'high',
        channel: 'promotions'
      }

      await sendNotification(notificationData)
      
      errorLogger.info('Flash sale notification sent', { productName, discount })
    } catch (error) {
      errorLogger.error('Failed to send flash sale notification', error)
    }
  }, [currentUser, sendNotification])

  // Send new product notification
  const sendNewProductNotification = useCallback(async (productName, category, price) => {
    if (!currentUser) return

    try {
      const notificationData = {
        title: 'New Product Available',
        body: `Check out the new ${productName} in ${category} for just $${price}!`,
        type: NOTIFICATION_TYPES.PROMOTIONAL,
        data: {
          productName,
          category,
          price,
          campaignType: 'new_product'
        },
        priority: 'normal',
        channel: 'promotions'
      }

      await sendNotification(notificationData)
      
      errorLogger.info('New product notification sent', { productName })
    } catch (error) {
      errorLogger.error('Failed to send new product notification', error)
    }
  }, [currentUser, sendNotification])

  return {
    sendPromotionalNotification,
    sendFlashSaleNotification,
    sendNewProductNotification
  }
}

// Hook to integrate notifications with system alerts
export const useSystemNotificationIntegration = () => {
  const { currentUser } = useAuth()
  const { sendNotification } = useNotifications()

  // Send system maintenance notification
  const sendMaintenanceNotification = useCallback(async (startTime, endTime, affectedServices = []) => {
    if (!currentUser) return

    try {
      const notificationData = {
        title: 'Scheduled Maintenance',
        body: `System maintenance is scheduled from ${startTime} to ${endTime}. ${affectedServices.length > 0 ? `Affected services: ${affectedServices.join(', ')}` : ''}`,
        type: NOTIFICATION_TYPES.SYSTEM_ALERT,
        data: {
          startTime,
          endTime,
          affectedServices,
          alertType: 'maintenance'
        },
        priority: 'high',
        channel: 'system'
      }

      await sendNotification(notificationData)
      
      errorLogger.info('Maintenance notification sent', { startTime, endTime })
    } catch (error) {
      errorLogger.error('Failed to send maintenance notification', error)
    }
  }, [currentUser, sendNotification])

  // Send security alert notification
  const sendSecurityAlertNotification = useCallback(async (alertType, message, actionRequired = false) => {
    if (!currentUser) return

    try {
      const notificationData = {
        title: 'Security Alert',
        body: message,
        type: NOTIFICATION_TYPES.SYSTEM_ALERT,
        data: {
          alertType,
          actionRequired,
          securityAlert: true
        },
        priority: actionRequired ? 'urgent' : 'high',
        channel: 'system'
      }

      await sendNotification(notificationData)
      
      errorLogger.info('Security alert notification sent', { alertType })
    } catch (error) {
      errorLogger.error('Failed to send security alert notification', error)
    }
  }, [currentUser, sendNotification])

  return {
    sendMaintenanceNotification,
    sendSecurityAlertNotification
  }
}

// Main integration hook
export const useNotificationIntegration = () => {
  const orderIntegration = useOrderNotificationIntegration()
  const walletIntegration = useWalletNotificationIntegration()
  const promotionalIntegration = usePromotionalNotificationIntegration()
  const systemIntegration = useSystemNotificationIntegration()

  return {
    ...orderIntegration,
    ...walletIntegration,
    ...promotionalIntegration,
    ...systemIntegration
  }
}

export default useNotificationIntegration
