import { useState, useEffect, useCallback } from 'react'
import { orderWorkflowManager, ORDER_STATUS } from '../services/orderWorkflow'
import firebaseService from '../services/firebaseService'
import { errorLogger } from '../utils/errorLogger'

export const useOrderManagement = (userId, userType = 'buyer') => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [updating, setUpdating] = useState(false)

  // Fetch orders
  const fetchOrders = useCallback(async () => {
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
        ORDER_STATUS.DELIVERED, // Confirm delivery
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

  // Get next possible actions for an order
  const getNextActions = useCallback((order) => {
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
  }, [])

  // Load orders on mount
  useEffect(() => {
    if (userId) {
      fetchOrders()
    }
  }, [userId, fetchOrders])

  // Refresh orders periodically (every 30 seconds)
  useEffect(() => {
    if (!userId) return

    const interval = setInterval(() => {
      fetchOrders()
    }, 30000)

    return () => clearInterval(interval)
  }, [userId, fetchOrders])

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
