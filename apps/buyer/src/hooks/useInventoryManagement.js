import { useState, useEffect, useCallback } from 'react'
import inventoryService, { 
  INVENTORY_STATUS, 
  INVENTORY_TRANSACTION_TYPES, 
  INVENTORY_ALERT_TYPES 
} from '../services/inventoryService'
import { errorLogger } from '../utils/errorLogger'

export const useInventoryManagement = (vendorId) => {
  const [inventories, setInventories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [updating, setUpdating] = useState(false)

  // Fetch vendor inventories
  const fetchInventories = useCallback(async (options = {}) => {
    if (!vendorId) return

    try {
      setLoading(true)
      setError(null)
      
      const inventoriesData = await inventoryService.getVendorInventory(vendorId, options)
      setInventories(inventoriesData)
    } catch (error) {
      errorLogger.error('Failed to fetch inventories', error)
      setError('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  // Fetch inventory analytics
  const fetchAnalytics = useCallback(async () => {
    if (!vendorId) return

    try {
      const analyticsData = await inventoryService.getInventoryAnalytics(vendorId)
      setAnalytics(analyticsData)
    } catch (error) {
      errorLogger.error('Failed to fetch inventory analytics', error)
    }
  }, [vendorId])

  // Fetch recommendations
  const fetchRecommendations = useCallback(async () => {
    if (!vendorId) return

    try {
      const recommendationsData = await inventoryService.getInventoryRecommendations(vendorId)
      setRecommendations(recommendationsData)
    } catch (error) {
      errorLogger.error('Failed to fetch inventory recommendations', error)
    }
  }, [vendorId])

  // Update stock level
  const updateStock = useCallback(async (inventoryId, quantity, type, options = {}) => {
    try {
      setUpdating(true)
      
      const result = await inventoryService.updateStock(inventoryId, quantity, type, options)
      
      // Refresh inventories
      await fetchInventories()
      
      errorLogger.info('Stock updated successfully', result)
      return result
    } catch (error) {
      errorLogger.error('Failed to update stock', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }, [fetchInventories])

  // Reserve stock
  const reserveStock = useCallback(async (productId, quantity, orderId) => {
    try {
      setUpdating(true)
      
      const result = await inventoryService.reserveStock(productId, quantity, orderId)
      
      // Refresh inventories
      await fetchInventories()
      
      return result
    } catch (error) {
      errorLogger.error('Failed to reserve stock', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }, [fetchInventories])

  // Release reserved stock
  const releaseReservedStock = useCallback(async (productId, quantity, orderId) => {
    try {
      setUpdating(true)
      
      const result = await inventoryService.releaseReservedStock(productId, quantity, orderId)
      
      // Refresh inventories
      await fetchInventories()
      
      return result
    } catch (error) {
      errorLogger.error('Failed to release reserved stock', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }, [fetchInventories])

  // Get inventory by product
  const getInventoryByProduct = useCallback(async (productId) => {
    try {
      return await inventoryService.getInventoryByProduct(productId)
    } catch (error) {
      errorLogger.error('Failed to get inventory by product', error)
      throw error
    }
  }, [])

  // Get inventory transactions
  const getInventoryTransactions = useCallback(async (inventoryId, options = {}) => {
    try {
      return await inventoryService.getInventoryTransactions(inventoryId, options)
    } catch (error) {
      errorLogger.error('Failed to get inventory transactions', error)
      throw error
    }
  }, [])

  // Bulk update inventories
  const bulkUpdateInventories = useCallback(async (updates) => {
    try {
      setUpdating(true)
      
      const result = await inventoryService.bulkUpdateInventory(updates)
      
      // Refresh inventories
      await fetchInventories()
      
      return result
    } catch (error) {
      errorLogger.error('Failed to bulk update inventories', error)
      throw error
    } finally {
      setUpdating(false)
    }
  }, [fetchInventories])

  // Get inventories by status
  const getInventoriesByStatus = useCallback((status) => {
    return inventories.filter(inventory => inventory.status === status)
  }, [inventories])

  // Get low stock inventories
  const getLowStockInventories = useCallback(() => {
    return inventories.filter(inventory => inventory.status === INVENTORY_STATUS.LOW_STOCK)
  }, [inventories])

  // Get out of stock inventories
  const getOutOfStockInventories = useCallback(() => {
    return inventories.filter(inventory => inventory.status === INVENTORY_STATUS.OUT_OF_STOCK)
  }, [inventories])

  // Get inventories with alerts
  const getInventoriesWithAlerts = useCallback(() => {
    return inventories.filter(inventory => 
      inventory.alerts && inventory.alerts.length > 0
    )
  }, [inventories])

  // Get inventory status color
  const getStatusColor = useCallback((status) => {
    const colors = {
      [INVENTORY_STATUS.IN_STOCK]: 'text-green-600 bg-green-100',
      [INVENTORY_STATUS.LOW_STOCK]: 'text-yellow-600 bg-yellow-100',
      [INVENTORY_STATUS.OUT_OF_STOCK]: 'text-red-600 bg-red-100',
      [INVENTORY_STATUS.DISCONTINUED]: 'text-gray-600 bg-gray-100',
      [INVENTORY_STATUS.PENDING_RESTOCK]: 'text-blue-600 bg-blue-100'
    }
    return colors[status] || 'text-gray-600 bg-gray-100'
  }, [])

  // Get status display name
  const getStatusDisplayName = useCallback((status) => {
    const names = {
      [INVENTORY_STATUS.IN_STOCK]: 'In Stock',
      [INVENTORY_STATUS.LOW_STOCK]: 'Low Stock',
      [INVENTORY_STATUS.OUT_OF_STOCK]: 'Out of Stock',
      [INVENTORY_STATUS.DISCONTINUED]: 'Discontinued',
      [INVENTORY_STATUS.PENDING_RESTOCK]: 'Pending Restock'
    }
    return names[status] || status
  }, [])

  // Get alert type display name
  const getAlertDisplayName = useCallback((alertType) => {
    const names = {
      [INVENTORY_ALERT_TYPES.LOW_STOCK]: 'Low Stock',
      [INVENTORY_ALERT_TYPES.OUT_OF_STOCK]: 'Out of Stock',
      [INVENTORY_ALERT_TYPES.OVERSTOCK]: 'Overstock',
      [INVENTORY_ALERT_TYPES.SLOW_MOVING]: 'Slow Moving',
      [INVENTORY_ALERT_TYPES.EXPIRING]: 'Expiring'
    }
    return names[alertType] || alertType
  }, [])

  // Get alert type color
  const getAlertColor = useCallback((alertType) => {
    const colors = {
      [INVENTORY_ALERT_TYPES.LOW_STOCK]: 'text-yellow-600 bg-yellow-100',
      [INVENTORY_ALERT_TYPES.OUT_OF_STOCK]: 'text-red-600 bg-red-100',
      [INVENTORY_ALERT_TYPES.OVERSTOCK]: 'text-purple-600 bg-purple-100',
      [INVENTORY_ALERT_TYPES.SLOW_MOVING]: 'text-blue-600 bg-blue-100',
      [INVENTORY_ALERT_TYPES.EXPIRING]: 'text-orange-600 bg-orange-100'
    }
    return colors[alertType] || 'text-gray-600 bg-gray-100'
  }, [])

  // Check if product is available
  const isProductAvailable = useCallback(async (productId, quantity = 1) => {
    try {
      const inventory = await getInventoryByProduct(productId)
      return inventory && inventory.availableStock >= quantity
    } catch (error) {
      errorLogger.error('Failed to check product availability', error)
      return false
    }
  }, [getInventoryByProduct])

  // Get inventory summary
  const getInventorySummary = useCallback(() => {
    const summary = {
      total: inventories.length,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      totalValue: 0,
      totalStock: 0,
      alerts: 0
    }

    inventories.forEach(inventory => {
      switch (inventory.status) {
        case INVENTORY_STATUS.IN_STOCK:
          summary.inStock++
          break
        case INVENTORY_STATUS.LOW_STOCK:
          summary.lowStock++
          break
        case INVENTORY_STATUS.OUT_OF_STOCK:
          summary.outOfStock++
          break
      }

      summary.totalValue += (inventory.currentStock || 0) * (inventory.cost || 0)
      summary.totalStock += inventory.currentStock || 0
      summary.alerts += inventory.alerts?.length || 0
    })

    return summary
  }, [inventories])

  // Load data on mount
  useEffect(() => {
    if (vendorId) {
      fetchInventories()
      fetchAnalytics()
      fetchRecommendations()
    }
  }, [vendorId, fetchInventories, fetchAnalytics, fetchRecommendations])

  // Refresh data periodically
  useEffect(() => {
    if (!vendorId) return

    const interval = setInterval(() => {
      fetchInventories()
    }, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [vendorId, fetchInventories])

  return {
    // State
    inventories,
    loading,
    error,
    analytics,
    recommendations,
    updating,
    
    // Actions
    fetchInventories,
    fetchAnalytics,
    fetchRecommendations,
    updateStock,
    reserveStock,
    releaseReservedStock,
    getInventoryByProduct,
    getInventoryTransactions,
    bulkUpdateInventories,
    
    // Selectors
    getInventoriesByStatus,
    getLowStockInventories,
    getOutOfStockInventories,
    getInventoriesWithAlerts,
    getInventorySummary,
    isProductAvailable,
    
    // Utilities
    getStatusColor,
    getStatusDisplayName,
    getAlertDisplayName,
    getAlertColor,
    
    // Status checks
    hasLowStock: getLowStockInventories().length > 0,
    hasOutOfStock: getOutOfStockInventories().length > 0,
    hasAlerts: getInventoriesWithAlerts().length > 0,
    
    // Refresh function
    refresh: () => {
      fetchInventories()
      fetchAnalytics()
      fetchRecommendations()
    }
  }
}

export default useInventoryManagement
