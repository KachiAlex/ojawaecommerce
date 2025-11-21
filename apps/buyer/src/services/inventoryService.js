import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { errorLogger } from '../utils/errorLogger'

// Inventory status definitions
export const INVENTORY_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  DISCONTINUED: 'discontinued',
  PENDING_RESTOCK: 'pending_restock'
}

// Inventory transaction types
export const INVENTORY_TRANSACTION_TYPES = {
  SALE: 'sale',
  RESTOCK: 'restock',
  ADJUSTMENT: 'adjustment',
  RETURN: 'return',
  DAMAGE: 'damage',
  TRANSFER: 'transfer',
  INITIAL: 'initial'
}

// Inventory alert types
export const INVENTORY_ALERT_TYPES = {
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  OVERSTOCK: 'overstock',
  SLOW_MOVING: 'slow_moving',
  EXPIRING: 'expiring'
}

// Inventory service
export const inventoryService = {
  // Get inventory status based on stock level
  getInventoryStatus(stock, lowStockThreshold = 10, outOfStockThreshold = 0) {
    if (stock <= outOfStockThreshold) {
      return INVENTORY_STATUS.OUT_OF_STOCK
    } else if (stock <= lowStockThreshold) {
      return INVENTORY_STATUS.LOW_STOCK
    } else {
      return INVENTORY_STATUS.IN_STOCK
    }
  },

  // Create inventory record for a product
  async createInventory(productId, vendorId, initialStock = 0, options = {}) {
    try {
      const {
        lowStockThreshold = 10,
        highStockThreshold = 100,
        reorderPoint = 5,
        reorderQuantity = 50,
        location = 'main_warehouse',
        cost = 0,
        expiryDate = null,
        batchNumber = null
      } = options

      const inventoryData = {
        productId,
        vendorId,
        currentStock: initialStock,
        reservedStock: 0,
        availableStock: initialStock,
        lowStockThreshold,
        highStockThreshold,
        reorderPoint,
        reorderQuantity,
        location,
        cost,
        expiryDate,
        batchNumber,
        status: this.getInventoryStatus(initialStock, lowStockThreshold),
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp(),
        alerts: [],
        transactions: []
      }

      const docRef = await addDoc(collection(db, 'inventory'), inventoryData)
      
      // Create initial transaction record
      if (initialStock > 0) {
        await this.addInventoryTransaction(docRef.id, {
          type: INVENTORY_TRANSACTION_TYPES.INITIAL,
          quantity: initialStock,
          reason: 'Initial inventory setup',
          cost,
          batchNumber,
          expiryDate
        })
      }

      errorLogger.info('Inventory created successfully', {
        inventoryId: docRef.id,
        productId,
        vendorId,
        initialStock
      })

      return docRef.id
    } catch (error) {
      errorLogger.error('Failed to create inventory', error)
      throw error
    }
  },

  // Get inventory by product ID
  async getInventoryByProduct(productId) {
    try {
      const q = query(
        collection(db, 'inventory'),
        where('productId', '==', productId)
      )
      
      const snapshot = await getDocs(q)
      const inventories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      return inventories.length > 0 ? inventories[0] : null
    } catch (error) {
      errorLogger.error('Failed to get inventory by product', error)
      throw error
    }
  },

  // Get all inventory for a vendor
  async getVendorInventory(vendorId, options = {}) {
    try {
      const {
        status = null,
        lowStock = false,
        outOfStock = false,
        pageSize = 50
      } = options

      let q = query(
        collection(db, 'inventory'),
        where('vendorId', '==', vendorId),
        orderBy('lastUpdated', 'desc')
      )

      if (status) {
        q = query(q, where('status', '==', status))
      }

      const snapshot = await getDocs(q)
      let inventories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Apply filters
      if (lowStock) {
        inventories = inventories.filter(inv => inv.status === INVENTORY_STATUS.LOW_STOCK)
      }

      if (outOfStock) {
        inventories = inventories.filter(inv => inv.status === INVENTORY_STATUS.OUT_OF_STOCK)
      }

      return inventories.slice(0, pageSize)
    } catch (error) {
      errorLogger.error('Failed to get vendor inventory', error)
      throw error
    }
  },

  // Update stock levels
  async updateStock(inventoryId, quantity, type, options = {}) {
    try {
      const {
        reason = '',
        cost = 0,
        batchNumber = null,
        expiryDate = null,
        orderId = null
      } = options

      const inventoryRef = doc(db, 'inventory', inventoryId)
      const inventorySnap = await getDoc(inventoryRef)

      if (!inventorySnap.exists()) {
        throw new Error('Inventory record not found')
      }

      const currentData = inventorySnap.data()
      const currentStock = currentData.currentStock || 0
      const reservedStock = currentData.reservedStock || 0

      let newStock
      let newReservedStock = reservedStock

      // Calculate new stock based on transaction type
      switch (type) {
        case INVENTORY_TRANSACTION_TYPES.SALE:
          newStock = currentStock - quantity
          if (newStock < 0) {
            throw new Error('Insufficient stock for sale')
          }
          break
        case INVENTORY_TRANSACTION_TYPES.RESTOCK:
          newStock = currentStock + quantity
          break
        case INVENTORY_TRANSACTION_TYPES.RETURN:
          newStock = currentStock + quantity
          break
        case INVENTORY_TRANSACTION_TYPES.ADJUSTMENT:
          newStock = currentStock + quantity // quantity can be positive or negative
          break
        case INVENTORY_TRANSACTION_TYPES.DAMAGE:
          newStock = currentStock - quantity
          if (newStock < 0) {
            throw new Error('Insufficient stock for damage adjustment')
          }
          break
        case 'reserve':
          newReservedStock = reservedStock + quantity
          if (newReservedStock > currentStock) {
            throw new Error('Cannot reserve more stock than available')
          }
          newStock = currentStock
          break
        case 'unreserve':
          newReservedStock = Math.max(0, reservedStock - quantity)
          newStock = currentStock
          break
        default:
          throw new Error('Invalid transaction type')
      }

      const availableStock = newStock - newReservedStock
      const newStatus = this.getInventoryStatus(availableStock, currentData.lowStockThreshold)

      // Update inventory record
      const updateData = {
        currentStock: newStock,
        reservedStock: newReservedStock,
        availableStock,
        status: newStatus,
        lastUpdated: serverTimestamp()
      }

      await updateDoc(inventoryRef, updateData)

      // Add transaction record
      await this.addInventoryTransaction(inventoryId, {
        type,
        quantity: Math.abs(quantity),
        reason,
        cost,
        batchNumber,
        expiryDate,
        orderId,
        stockBefore: currentStock,
        stockAfter: newStock,
        reservedBefore: reservedStock,
        reservedAfter: newReservedStock
      })

      // Check for alerts
      await this.checkInventoryAlerts(inventoryId, newStatus, availableStock, currentData)

      errorLogger.info('Stock updated successfully', {
        inventoryId,
        type,
        quantity,
        stockBefore: currentStock,
        stockAfter: newStock,
        newStatus
      })

      return {
        inventoryId,
        newStock,
        newReservedStock,
        availableStock,
        newStatus
      }
    } catch (error) {
      errorLogger.error('Failed to update stock', error)
      throw error
    }
  },

  // Reserve stock for an order
  async reserveStock(productId, quantity, orderId) {
    try {
      const inventory = await this.getInventoryByProduct(productId)
      if (!inventory) {
        throw new Error('Product inventory not found')
      }

      if (inventory.availableStock < quantity) {
        throw new Error('Insufficient stock available')
      }

      await this.updateStock(inventory.id, quantity, 'reserve', {
        reason: `Reserved for order ${orderId}`,
        orderId
      })

      return {
        success: true,
        reservedQuantity: quantity,
        remainingStock: inventory.availableStock - quantity
      }
    } catch (error) {
      errorLogger.error('Failed to reserve stock', error)
      throw error
    }
  },

  // Release reserved stock
  async releaseReservedStock(productId, quantity, orderId) {
    try {
      const inventory = await this.getInventoryByProduct(productId)
      if (!inventory) {
        throw new Error('Product inventory not found')
      }

      await this.updateStock(inventory.id, quantity, 'unreserve', {
        reason: `Released from order ${orderId}`,
        orderId
      })

      return {
        success: true,
        releasedQuantity: quantity
      }
    } catch (error) {
      errorLogger.error('Failed to release reserved stock', error)
      throw error
    }
  },

  // Add inventory transaction
  async addInventoryTransaction(inventoryId, transactionData) {
    try {
      const transactionRef = doc(collection(db, 'inventory_transactions'))
      const transaction = {
        inventoryId,
        ...transactionData,
        timestamp: serverTimestamp(),
        createdAt: new Date()
      }

      await addDoc(collection(db, 'inventory_transactions'), transaction)

      // Update inventory transactions array
      const inventoryRef = doc(db, 'inventory', inventoryId)
      await updateDoc(inventoryRef, {
        transactions: arrayUnion(transactionRef.id)
      })

      return transactionRef.id
    } catch (error) {
      errorLogger.error('Failed to add inventory transaction', error)
      throw error
    }
  },

  // Get inventory transactions
  async getInventoryTransactions(inventoryId, options = {}) {
    try {
      const { limit = 50, type = null } = options

      let q = query(
        collection(db, 'inventory_transactions'),
        where('inventoryId', '==', inventoryId),
        orderBy('timestamp', 'desc')
      )

      if (type) {
        q = query(q, where('type', '==', type))
      }

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).slice(0, limit)
    } catch (error) {
      errorLogger.error('Failed to get inventory transactions', error)
      throw error
    }
  },

  // Check and create inventory alerts
  async checkInventoryAlerts(inventoryId, status, availableStock, inventoryData) {
    try {
      const alerts = []
      const currentAlerts = inventoryData.alerts || []

      // Low stock alert
      if (status === INVENTORY_STATUS.LOW_STOCK && 
          !currentAlerts.includes(INVENTORY_ALERT_TYPES.LOW_STOCK)) {
        alerts.push(INVENTORY_ALERT_TYPES.LOW_STOCK)
      }

      // Out of stock alert
      if (status === INVENTORY_STATUS.OUT_OF_STOCK && 
          !currentAlerts.includes(INVENTORY_ALERT_TYPES.OUT_OF_STOCK)) {
        alerts.push(INVENTORY_ALERT_TYPES.OUT_OF_STOCK)
      }

      // Overstock alert
      if (availableStock > inventoryData.highStockThreshold && 
          !currentAlerts.includes(INVENTORY_ALERT_TYPES.OVERSTOCK)) {
        alerts.push(INVENTORY_ALERT_TYPES.OVERSTOCK)
      }

      if (alerts.length > 0) {
        const inventoryRef = doc(db, 'inventory', inventoryId)
        await updateDoc(inventoryRef, {
          alerts: arrayUnion(...alerts),
          lastAlertDate: serverTimestamp()
        })

        // Create alert records
        for (const alertType of alerts) {
          await this.createInventoryAlert(inventoryId, alertType, {
            availableStock,
            threshold: this.getAlertThreshold(alertType, inventoryData)
          })
        }
      }

      // Clear resolved alerts
      const resolvedAlerts = []
      if (status === INVENTORY_STATUS.IN_STOCK) {
        resolvedAlerts.push(
          INVENTORY_ALERT_TYPES.LOW_STOCK,
          INVENTORY_ALERT_TYPES.OUT_OF_STOCK
        )
      }

      if (availableStock <= inventoryData.highStockThreshold) {
        resolvedAlerts.push(INVENTORY_ALERT_TYPES.OVERSTOCK)
      }

      if (resolvedAlerts.length > 0) {
        const inventoryRef = doc(db, 'inventory', inventoryId)
        await updateDoc(inventoryRef, {
          alerts: arrayRemove(...resolvedAlerts)
        })
      }

    } catch (error) {
      errorLogger.error('Failed to check inventory alerts', error)
    }
  },

  // Get alert threshold
  getAlertThreshold(alertType, inventoryData) {
    switch (alertType) {
      case INVENTORY_ALERT_TYPES.LOW_STOCK:
        return inventoryData.lowStockThreshold
      case INVENTORY_ALERT_TYPES.OUT_OF_STOCK:
        return 0
      case INVENTORY_ALERT_TYPES.OVERSTOCK:
        return inventoryData.highStockThreshold
      default:
        return 0
    }
  },

  // Create inventory alert
  async createInventoryAlert(inventoryId, alertType, data) {
    try {
      const alertData = {
        inventoryId,
        type: alertType,
        ...data,
        status: 'active',
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, 'inventory_alerts'), alertData)
    } catch (error) {
      errorLogger.error('Failed to create inventory alert', error)
    }
  },

  // Get inventory analytics
  async getInventoryAnalytics(vendorId, options = {}) {
    try {
      const { period = '30d' } = options

      const inventories = await this.getVendorInventory(vendorId, { pageSize: 1000 })
      
      const analytics = {
        totalProducts: inventories.length,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0,
        totalStock: 0,
        alerts: {
          lowStock: 0,
          outOfStock: 0,
          overstock: 0
        },
        topSelling: [],
        slowMoving: []
      }

      inventories.forEach(inventory => {
        // Count by status
        switch (inventory.status) {
          case INVENTORY_STATUS.IN_STOCK:
            analytics.inStock++
            break
          case INVENTORY_STATUS.LOW_STOCK:
            analytics.lowStock++
            break
          case INVENTORY_STATUS.OUT_OF_STOCK:
            analytics.outOfStock++
            break
        }

        // Calculate total value and stock
        const value = (inventory.currentStock || 0) * (inventory.cost || 0)
        analytics.totalValue += value
        analytics.totalStock += inventory.currentStock || 0

        // Count alerts
        const alerts = inventory.alerts || []
        alerts.forEach(alert => {
          if (alert === INVENTORY_ALERT_TYPES.LOW_STOCK) {
            analytics.alerts.lowStock++
          } else if (alert === INVENTORY_ALERT_TYPES.OUT_OF_STOCK) {
            analytics.alerts.outOfStock++
          } else if (alert === INVENTORY_ALERT_TYPES.OVERSTOCK) {
            analytics.alerts.overstock++
          }
        })
      })

      return analytics
    } catch (error) {
      errorLogger.error('Failed to get inventory analytics', error)
      throw error
    }
  },

  // Bulk update inventory
  async bulkUpdateInventory(updates) {
    try {
      const batch = writeBatch(db)
      
      for (const update of updates) {
        const { inventoryId, ...updateData } = update
        const inventoryRef = doc(db, 'inventory', inventoryId)
        batch.update(inventoryRef, {
          ...updateData,
          lastUpdated: serverTimestamp()
        })
      }

      await batch.commit()
      
      errorLogger.info('Bulk inventory update completed', {
        updateCount: updates.length
      })

      return { success: true, updatedCount: updates.length }
    } catch (error) {
      errorLogger.error('Failed to bulk update inventory', error)
      throw error
    }
  },

  // Get inventory recommendations
  async getInventoryRecommendations(vendorId) {
    try {
      const inventories = await this.getVendorInventory(vendorId, { pageSize: 1000 })
      
      const recommendations = {
        restock: [],
        reduce: [],
        discontinue: []
      }

      inventories.forEach(inventory => {
        const { currentStock, lowStockThreshold, highStockThreshold, reorderPoint, reorderQuantity } = inventory

        // Restock recommendations
        if (currentStock <= reorderPoint) {
          recommendations.restock.push({
            inventoryId: inventory.id,
            productId: inventory.productId,
            currentStock,
            recommendedQuantity: reorderQuantity,
            priority: currentStock === 0 ? 'high' : 'medium'
          })
        }

        // Reduce stock recommendations
        if (currentStock > highStockThreshold * 1.5) {
          recommendations.reduce.push({
            inventoryId: inventory.id,
            productId: inventory.productId,
            currentStock,
            recommendedReduction: Math.floor((currentStock - highStockThreshold) / 2),
            reason: 'Overstock'
          })
        }
      })

      return recommendations
    } catch (error) {
      errorLogger.error('Failed to get inventory recommendations', error)
      throw error
    }
  }
}

export default inventoryService
