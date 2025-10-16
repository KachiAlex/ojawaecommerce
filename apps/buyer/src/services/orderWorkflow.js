import firebaseService from './firebaseService'
import { errorLogger } from '../utils/errorLogger'

// Order status definitions and workflow
export const ORDER_STATUS = {
  // Initial states
  PENDING: 'pending',
  PAYMENT_PENDING: 'payment_pending',
  PAYMENT_FAILED: 'payment_failed',
  
  // Processing states
  CONFIRMED: 'confirmed',
  ESCROW_FUNDED: 'escrow_funded',
  PROCESSING: 'processing',
  READY_FOR_SHIPMENT: 'ready_for_shipment',
  
  // Shipping states
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  
  // Completion states
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  
  // Problem states
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
  RETURNED: 'returned'
}

// Order status workflow configuration
export const ORDER_WORKFLOW = {
  [ORDER_STATUS.PENDING]: {
    name: 'Order Pending',
    description: 'Order has been placed and is awaiting payment',
    color: 'yellow',
    nextStates: [ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.CANCELLED],
    notifications: ['buyer_order_placed', 'vendor_new_order'],
    autoTransition: false,
    estimatedDuration: '5 minutes'
  },
  
  [ORDER_STATUS.PAYMENT_PENDING]: {
    name: 'Payment Pending',
    description: 'Payment is being processed',
    color: 'blue',
    nextStates: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PAYMENT_FAILED],
    notifications: ['buyer_payment_processing'],
    autoTransition: true,
    estimatedDuration: '2-5 minutes'
  },
  
  [ORDER_STATUS.PAYMENT_FAILED]: {
    name: 'Payment Failed',
    description: 'Payment could not be processed',
    color: 'red',
    nextStates: [ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.CANCELLED],
    notifications: ['buyer_payment_failed'],
    autoTransition: false,
    estimatedDuration: 'Manual action required'
  },
  
  [ORDER_STATUS.CONFIRMED]: {
    name: 'Order Confirmed',
    description: 'Payment successful, order confirmed',
    color: 'green',
    nextStates: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    notifications: ['buyer_payment_success', 'vendor_payment_received'],
    autoTransition: false,
    estimatedDuration: 'Immediate'
  },
  
  'escrow_funded': {
    name: 'Escrow Funded',
    description: 'Payment held in escrow, awaiting vendor processing',
    color: 'emerald',
    nextStates: ['processing', 'cancelled'],
    notifications: ['buyer_escrow_funded', 'vendor_escrow_funded'],
    autoTransition: false,
    estimatedDuration: 'Immediate'
  },
  
  [ORDER_STATUS.PROCESSING]: {
    name: 'Processing',
    description: 'Vendor is preparing the order',
    color: 'blue',
    nextStates: [ORDER_STATUS.READY_FOR_SHIPMENT, ORDER_STATUS.CANCELLED],
    notifications: ['buyer_order_processing', 'vendor_start_processing'],
    autoTransition: false,
    estimatedDuration: '1-3 business days'
  },
  
  [ORDER_STATUS.READY_FOR_SHIPMENT]: {
    name: 'Ready for Shipment',
    description: 'Order is packed and ready for pickup',
    color: 'purple',
    nextStates: [ORDER_STATUS.SHIPPED],
    notifications: ['buyer_ready_to_ship', 'logistics_pickup_required'],
    autoTransition: false,
    estimatedDuration: '1 day'
  },
  
  [ORDER_STATUS.SHIPPED]: {
    name: 'Shipped',
    description: 'Order has been picked up and is on its way',
    color: 'blue',
    nextStates: [ORDER_STATUS.IN_TRANSIT],
    notifications: ['buyer_order_shipped', 'vendor_order_shipped'],
    autoTransition: true,
    estimatedDuration: 'Immediate'
  },
  
  [ORDER_STATUS.IN_TRANSIT]: {
    name: 'In Transit',
    description: 'Order is on its way to the destination',
    color: 'blue',
    nextStates: [ORDER_STATUS.OUT_FOR_DELIVERY],
    notifications: ['buyer_in_transit'],
    autoTransition: true,
    estimatedDuration: '2-7 days'
  },
  
  [ORDER_STATUS.OUT_FOR_DELIVERY]: {
    name: 'Out for Delivery',
    description: 'Order is out for final delivery',
    color: 'orange',
    nextStates: [ORDER_STATUS.DELIVERED],
    notifications: ['buyer_out_for_delivery'],
    autoTransition: false,
    estimatedDuration: '1 day'
  },
  
  [ORDER_STATUS.DELIVERED]: {
    name: 'Delivered',
    description: 'Order has been delivered',
    color: 'green',
    nextStates: [ORDER_STATUS.COMPLETED, ORDER_STATUS.DISPUTED, ORDER_STATUS.RETURNED],
    notifications: ['buyer_delivered', 'vendor_delivered'],
    autoTransition: false,
    estimatedDuration: 'Immediate'
  },
  
  [ORDER_STATUS.COMPLETED]: {
    name: 'Completed',
    description: 'Order completed successfully',
    color: 'green',
    nextStates: [],
    notifications: ['buyer_order_completed', 'vendor_order_completed'],
    autoTransition: false,
    estimatedDuration: 'Immediate'
  },
  
  [ORDER_STATUS.CANCELLED]: {
    name: 'Cancelled',
    description: 'Order has been cancelled',
    color: 'red',
    nextStates: [ORDER_STATUS.REFUNDED],
    notifications: ['buyer_order_cancelled', 'vendor_order_cancelled'],
    autoTransition: false,
    estimatedDuration: 'Immediate'
  },
  
  [ORDER_STATUS.REFUNDED]: {
    name: 'Refunded',
    description: 'Order has been refunded',
    color: 'gray',
    nextStates: [],
    notifications: ['buyer_refunded', 'vendor_refunded'],
    autoTransition: false,
    estimatedDuration: '3-10 business days'
  },
  
  [ORDER_STATUS.DISPUTED]: {
    name: 'Disputed',
    description: 'Order is under dispute',
    color: 'red',
    nextStates: [ORDER_STATUS.RESOLVED, ORDER_STATUS.REFUNDED],
    notifications: ['buyer_dispute_created', 'vendor_dispute_created', 'admin_dispute_created'],
    autoTransition: false,
    estimatedDuration: 'Manual review required'
  },
  
  [ORDER_STATUS.RETURNED]: {
    name: 'Returned',
    description: 'Order has been returned',
    color: 'orange',
    nextStates: [ORDER_STATUS.REFUNDED],
    notifications: ['buyer_returned', 'vendor_returned'],
    autoTransition: false,
    estimatedDuration: '3-10 business days'
  }
}

// Order workflow manager
export class OrderWorkflowManager {
  constructor() {
    this.workflow = ORDER_WORKFLOW
    this.statuses = ORDER_STATUS
  }

  // Get status configuration
  getStatusConfig(status) {
    return this.workflow[status] || null
  }

  // Get next possible statuses
  getNextStatuses(currentStatus) {
    const config = this.getStatusConfig(currentStatus)
    return config ? config.nextStates : []
  }

  // Check if transition is valid
  isValidTransition(fromStatus, toStatus) {
    const nextStatuses = this.getNextStatuses(fromStatus)
    return nextStatuses.includes(toStatus)
  }

  // Get status color for UI
  getStatusColor(status) {
    const config = this.getStatusConfig(status)
    return config ? config.color : 'gray'
  }

  // Get status display name
  getStatusDisplayName(status) {
    const config = this.getStatusConfig(status)
    return config ? config.name : status
  }

  // Get status description
  getStatusDescription(status) {
    const config = this.getStatusConfig(status)
    return config ? config.description : ''
  }

  // Get estimated duration for status
  getEstimatedDuration(status) {
    const config = this.getStatusConfig(status)
    return config ? config.estimatedDuration : ''
  }

  // Check if status has auto-transition
  hasAutoTransition(status) {
    const config = this.getStatusConfig(status)
    return config ? config.autoTransition : false
  }

  // Get notifications for status change
  getNotifications(status) {
    const config = this.getStatusConfig(status)
    return config ? config.notifications : []
  }

  // Update order status with workflow validation
  async updateOrderStatus(orderId, newStatus, userId, userType, additionalData = {}) {
    try {
      // Get current order
      const order = await firebaseService.orders.getById(orderId)
      if (!order) {
        throw new Error('Order not found')
      }

      const currentStatus = order.status
      
      // Validate transition
      if (!this.isValidTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`)
      }

      // Prepare update data
      const updateData = {
        status: newStatus,
        updatedAt: new Date(),
        [`${userType}UpdatedAt`]: new Date(),
        [`${userType}UpdatedBy`]: userId,
        ...additionalData
      }

      // Add status-specific data
      const statusConfig = this.getStatusConfig(newStatus)
      if (statusConfig) {
        updateData.statusHistory = [
          ...(order.statusHistory || []),
          {
            status: newStatus,
            timestamp: new Date(),
            updatedBy: userId,
            userType,
            description: statusConfig.description,
            additionalData
          }
        ]
      }

      // Update order
      await firebaseService.orders.updateStatus(orderId, newStatus, updateData)

      // Send notifications
      await this.sendStatusNotifications(orderId, order, newStatus, additionalData)

      // Handle auto-transitions
      if (statusConfig?.autoTransition) {
        await this.handleAutoTransition(orderId, newStatus, additionalData)
      }

      // Log the status change
      errorLogger.info(`Order ${orderId} status changed from ${currentStatus} to ${newStatus}`, {
        orderId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        userId,
        userType,
        additionalData
      })

      return { success: true, orderId, newStatus }
    } catch (error) {
      errorLogger.error('Failed to update order status', error, {
        orderId,
        newStatus,
        userId,
        userType
      })
      throw error
    }
  }

  // Handle auto-transitions
  async handleAutoTransition(orderId, currentStatus, additionalData = {}) {
    const transitions = {
      [ORDER_STATUS.SHIPPED]: {
        nextStatus: ORDER_STATUS.IN_TRANSIT,
        delay: 1000, // 1 second for demo
        data: { autoTransition: true }
      },
      [ORDER_STATUS.IN_TRANSIT]: {
        nextStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
        delay: 2000, // 2 seconds for demo
        data: { autoTransition: true }
      }
    }

    const transition = transitions[currentStatus]
    if (transition) {
      setTimeout(async () => {
        try {
          await this.updateOrderStatus(
            orderId,
            transition.nextStatus,
            'system',
            'system',
            transition.data
          )
        } catch (error) {
          errorLogger.error('Auto-transition failed', error, {
            orderId,
            fromStatus: currentStatus,
            toStatus: transition.nextStatus
          })
        }
      }, transition.delay)
    }
  }

  // Send status change notifications
  async sendStatusNotifications(orderId, order, newStatus, additionalData = {}) {
    try {
      const notifications = this.getNotifications(newStatus)
      const statusConfig = this.getStatusConfig(newStatus)

      // Create notification data
      const notificationData = {
        orderId,
        status: newStatus,
        statusName: statusConfig?.name || newStatus,
        statusDescription: statusConfig?.description || '',
        order: {
          id: orderId,
          totalAmount: order.totalAmount,
          buyerName: order.buyerName,
          vendorName: order.vendorName || 'Vendor'
        },
        additionalData,
        timestamp: new Date()
      }

      // Send notifications based on the status
      for (const notificationType of notifications) {
        await this.sendNotification(notificationType, notificationData)
      }
    } catch (error) {
      errorLogger.error('Failed to send status notifications', error, {
        orderId,
        newStatus
      })
    }
  }

  // Send individual notification
  async sendNotification(notificationType, data) {
    try {
      // In a real app, this would integrate with email, SMS, push notifications, etc.
      console.log(`Sending notification: ${notificationType}`, data)
      
      // For now, we'll just log the notification
      errorLogger.info(`Notification sent: ${notificationType}`, data)
    } catch (error) {
      errorLogger.error(`Failed to send notification: ${notificationType}`, error, data)
    }
  }

  // Get order timeline
  getOrderTimeline(order) {
    const timeline = []
    const statusHistory = order.statusHistory || []

    // Add current status
    const currentConfig = this.getStatusConfig(order.status)
    if (currentConfig) {
      timeline.push({
        status: order.status,
        name: currentConfig.name,
        description: currentConfig.description,
        timestamp: order.updatedAt || order.createdAt,
        isCurrent: true,
        color: currentConfig.color
      })
    }

    // Add historical statuses
    statusHistory.forEach(entry => {
      const config = this.getStatusConfig(entry.status)
      if (config) {
        timeline.push({
          status: entry.status,
          name: config.name,
          description: config.description,
          timestamp: entry.timestamp,
          updatedBy: entry.updatedBy,
          userType: entry.userType,
          isCurrent: false,
          color: config.color
        })
      }
    })

    // Sort by timestamp
    return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  }

  // Get order progress percentage
  getOrderProgress(order) {
    const statusOrder = [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.PAYMENT_PENDING,
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.PROCESSING,
      ORDER_STATUS.READY_FOR_SHIPMENT,
      ORDER_STATUS.SHIPPED,
      ORDER_STATUS.IN_TRANSIT,
      ORDER_STATUS.OUT_FOR_DELIVERY,
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.COMPLETED
    ]

    const currentIndex = statusOrder.indexOf(order.status)
    if (currentIndex === -1) return 0

    return Math.round((currentIndex / (statusOrder.length - 1)) * 100)
  }
}

// Export singleton instance
export const orderWorkflowManager = new OrderWorkflowManager()

// Export helper functions
export const {
  getStatusConfig,
  getNextStatuses,
  isValidTransition,
  getStatusColor,
  getStatusDisplayName,
  getStatusDescription,
  getEstimatedDuration,
  hasAutoTransition,
  getNotifications
} = orderWorkflowManager
