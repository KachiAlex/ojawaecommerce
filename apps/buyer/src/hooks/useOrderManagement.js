import { useState, useEffect, useCallback } from 'react'
import { orderWorkflowManager, ORDER_STATUS } from '../services/orderWorkflow'
import firebaseService from '../services/firebaseService'
import { errorLogger } from '../utils/errorLogger'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

export const useOrderManagement = (userId, userType = 'buyer') => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [updating, setUpdating] = useState(false)

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!userId) {
      setOrders([])
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const ordersData = await firebaseService.orders.getByUserPaged({
        userId,
        userType,
        pageSize: 50
      })
      
      setOrders(ordersData.items || [])
    } catch (error) {
      errorLogger.error('Failed to fetch orders', error, { userId, userType })
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [userId, userType])

  // Update order status
  const updateOrderStatus = useCallback(async (orderId, newStatus, additionalData = {}) => {
    try {
      setUpdating(true)
      
      const result = await orderWorkflowManager.updateOrderStatus(
        orderId,
        newStatus,
        userId,
        userType,
        additionalData
      )
      
      // Refresh orders after successful update
      await fetchOrders()
      
      // Update selected order if it's the one being updated
      if (selectedOrder && selectedOrder.id === orderId) {
        const updatedOrder = await firebaseService.orders.getById(orderId)
        setSelectedOrder(updatedOrder)
      }
      
      return result
    } catch (error) {
      errorLogger.error('Failed to update order status', error, {
        orderId,
        newStatus,
        userId,
        userType
      })
      throw error
    } finally {
      setUpdating(false)
    }
  }, [userId, userType, selectedOrder, fetchOrders])

  // Cancel order
  const cancelOrder = useCallback(async (orderId, reason = '') => {
    return updateOrderStatus(orderId, ORDER_STATUS.CANCELLED, {
      cancellationReason: reason,
      cancelledAt: new Date()
    })
  }, [updateOrderStatus])

  // Mark order as shipped
  const markAsShipped = useCallback(async (orderId, shippingData) => {
    return updateOrderStatus(orderId, ORDER_STATUS.SHIPPED, {
      ...shippingData,
      shippedAt: new Date()
    })
  }, [updateOrderStatus])

  // Mark order as delivered
  const markAsDelivered = useCallback(async (orderId, deliveryData = {}) => {
    return updateOrderStatus(orderId, ORDER_STATUS.DELIVERED, {
      ...deliveryData,
      deliveredAt: new Date()
    })
  }, [updateOrderStatus])

  // Complete order (for vendors)
  const completeOrder = useCallback(async (orderId) => {
    return updateOrderStatus(orderId, ORDER_STATUS.COMPLETED, {
      completedAt: new Date()
    })
  }, [updateOrderStatus])

  // Create dispute
  const createDispute = useCallback(async (orderId, disputeData) => {
    return updateOrderStatus(orderId, ORDER_STATUS.DISPUTED, {
      disputeData,
      disputedAt: new Date()
    })
  }, [updateOrderStatus])

  // Get order statistics
  const getOrderStats = useCallback(() => {
    const stats = {
      total: orders.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0,
      disputed: 0,
      totalValue: 0,
      averageValue: 0
    }

    orders.forEach(order => {
      stats.totalValue += parseFloat(order.totalAmount) || 0
      
      switch (order.status) {
        case ORDER_STATUS.PENDING:
        case ORDER_STATUS.PAYMENT_PENDING:
          stats.pending++
          break
        case ORDER_STATUS.PROCESSING:
        case ORDER_STATUS.READY_FOR_SHIPMENT:
          stats.processing++
          break
        case ORDER_STATUS.SHIPPED:
        case ORDER_STATUS.IN_TRANSIT:
        case ORDER_STATUS.OUT_FOR_DELIVERY:
          stats.shipped++
          break
        case ORDER_STATUS.DELIVERED:
          stats.delivered++
          break
        case ORDER_STATUS.COMPLETED:
          stats.completed++
          break
        case ORDER_STATUS.CANCELLED:
          stats.cancelled++
          break
        case ORDER_STATUS.DISPUTED:
          stats.disputed++
          break
      }
    })

    stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0

    return stats
  }, [orders])

  // Get orders by status
  const getOrdersByStatus = useCallback((status) => {
    return orders.filter(order => order.status === status)
  }, [orders])

  // Get recent orders
  const getRecentOrders = useCallback((limit = 5) => {
    return orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
  }, [orders])

  // Get orders needing action
  const getOrdersNeedingAction = useCallback(() => {
    const actionRequiredStatuses = []
    
    if (userType === 'buyer') {
      actionRequiredStatuses.push(
        ORDER_STATUS.DELIVERED, // Confirm order
        ORDER_STATUS.PAYMENT_FAILED // Retry payment
      )
    } else if (userType === 'vendor') {
      actionRequiredStatuses.push(
        ORDER_STATUS.CONFIRMED, // Start processing
        ORDER_STATUS.PROCESSING, // Mark ready for shipment
        ORDER_STATUS.READY_FOR_SHIPMENT, // Mark as shipped
        ORDER_STATUS.SHIPPED // Complete delivery
      )
    }

    return orders.filter(order => actionRequiredStatuses.includes(order.status))
  }, [orders, userType])

  // Get order timeline
  const getOrderTimeline = useCallback((order) => {
    return orderWorkflowManager.getOrderTimeline(order)
  }, [])

  // Get order progress
  const getOrderProgress = useCallback((order) => {
    return orderWorkflowManager.getOrderProgress(order)
  }, [])

  // Get next possible actions for an order, scoped by user type
  const getNextActions = useCallback((order) => {
    // Buyers should not see vendor workflow actions like Processing/Shipped/etc.
    if (userType === 'buyer') {
      const buyerActions = []
      // Primary buyer action happens after delivery: confirm order & satisfaction
      if (order.status === ORDER_STATUS.DELIVERED && !order.satisfactionConfirmed) {
        buyerActions.push({
          status: 'confirm_order',
          name: 'Confirm Order',
          description: 'Confirm you have received the product and are satisfied with it',
          color: 'green',
          action: 'confirm_order'
        })
      }
      // Optionally allow cancel while pending payment processing
      if (order.status === ORDER_STATUS.PENDING || order.status === ORDER_STATUS.PAYMENT_PENDING) {
        buyerActions.push({
          status: 'cancel',
          name: 'Cancel Order',
          description: 'Cancel this order before it is processed',
          color: 'red',
          action: 'cancel'
        })
      }
      return buyerActions
    }

    // Vendors see the standard next workflow states
    const nextStatuses = orderWorkflowManager.getNextStatuses(order.status)
    const actions = []

    nextStatuses.forEach(status => {
      const config = orderWorkflowManager.getStatusConfig(status)
      if (config) {
        actions.push({
          status,
          name: config.name,
          description: config.description,
          color: config.color,
          action: status
        })
      }
    })

    return actions
  }, [userType])

  // Load orders on mount
  useEffect(() => {
    if (userId) {
      fetchOrders()
    }
  }, [userId, fetchOrders])

  // Real-time payout status updates
  useEffect(() => {
    if (!userId) return undefined

    const field = userType === 'buyer' ? 'buyerId' : 'vendorId'
    const ordersRef = collection(db, 'orders')
    const q = query(ordersRef, where(field, '==', userId))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders((current) => {
        if (!Array.isArray(current) || current.length === 0) {
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }

        const updates = {}
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            updates[change.doc.id] = change.doc.data()
          }
        })

        if (Object.keys(updates).length === 0) {
          return current
        }

        return current.map((order) => {
          if (!updates[order.id]) {
            return order
          }
          const updated = updates[order.id]
          const interestingFields = ['payoutStatus', 'payoutTotals', 'payoutRequestId', 'payoutStakeholders', 'vat']
          const hasMeaningfulChange = interestingFields.some((fieldName) => {
            const prevValue = order[fieldName]
            const nextValue = updated[fieldName]
            if (typeof prevValue === 'object' || typeof nextValue === 'object') {
              return JSON.stringify(prevValue || null) !== JSON.stringify(nextValue || null)
            }
            return prevValue !== nextValue
          })

          return hasMeaningfulChange ? { ...order, ...updated } : order
        })
      })
    })

    return () => unsubscribe()
  }, [userId, userType])

  return {
    // State
    orders,
    loading,
    error,
    selectedOrder,
    updating,
    
    // Actions
    fetchOrders,
    updateOrderStatus,
    cancelOrder,
    markAsShipped,
    markAsDelivered,
    completeOrder,
    createDispute,
    
    // Selectors
    getOrderStats,
    getOrdersByStatus,
    getRecentOrders,
    getOrdersNeedingAction,
    getOrderTimeline,
    getOrderProgress,
    getNextActions,
    
    // Utilities
    setSelectedOrder,
    refreshOrders: fetchOrders
  }
}

export default useOrderManagement
