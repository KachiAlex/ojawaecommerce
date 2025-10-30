import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import secureStorage from '../utils/secureStorage'
import { useAuth } from './AuthContext'
import inventoryService from '../services/inventoryService'
import { errorLogger } from '../utils/errorLogger'

const EnhancedCartContext = createContext()

export const useEnhancedCart = () => {
  const context = useContext(EnhancedCartContext)
  if (!context) {
    throw new Error('useEnhancedCart must be used within an EnhancedCartProvider')
  }
  return context
}

export const EnhancedCartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([])
  const [inventoryChecks, setInventoryChecks] = useState({})
  const [checkingInventory, setCheckingInventory] = useState(false)
  const { currentUser } = useAuth()

  // Load cart (encrypted) on mount
  useEffect(() => {
    (async () => {
      const savedCart = await secureStorage.getItem('enhanced_cart')
      if (savedCart) {
        try {
          const cartData = JSON.parse(savedCart)
          setCartItems(cartData.items || [])
          setInventoryChecks(cartData.inventoryChecks || {})
        } catch (error) {
          errorLogger.error('Error loading cart from secure storage', error)
        }
      }
    })()
  }, [])

  // Save cart (encrypted) whenever it changes
  useEffect(() => {
    const cartData = {
      items: cartItems,
      inventoryChecks,
      lastUpdated: new Date().toISOString()
    }
    ;(async () => {
      await secureStorage.setItem('enhanced_cart', JSON.stringify(cartData))
    })()
  }, [cartItems, inventoryChecks])

  // Check inventory availability for a product
  const checkInventoryAvailability = useCallback(async (productId, quantity = 1) => {
    try {
      const inventory = await inventoryService.getInventoryByProduct(productId)
      
      if (!inventory) {
        return {
          available: false,
          message: 'Product inventory not found',
          availableStock: 0,
          status: 'unknown'
        }
      }

      const available = inventory.availableStock >= quantity
      
      return {
        available,
        message: available 
          ? `${quantity} units available` 
          : `Only ${inventory.availableStock} units available`,
        availableStock: inventory.availableStock,
        status: inventory.status,
        inventory
      }
    } catch (error) {
      errorLogger.error('Failed to check inventory availability', error)
      return {
        available: false,
        message: 'Unable to check inventory',
        availableStock: 0,
        status: 'error'
      }
    }
  }, [])

  // Validate all cart items against inventory
  const validateCartInventory = useCallback(async () => {
    if (cartItems.length === 0) {
      setInventoryChecks({})
      return
    }

    setCheckingInventory(true)
    
    try {
      const checks = {}
      
      for (const item of cartItems) {
        const check = await checkInventoryAvailability(item.id, item.quantity)
        checks[item.id] = check
      }
      
      setInventoryChecks(checks)
    } catch (error) {
      errorLogger.error('Failed to validate cart inventory', error)
    } finally {
      setCheckingInventory(false)
    }
  }, [cartItems, checkInventoryAvailability])

  // Add to cart with inventory validation
  const addToCart = useCallback(async (product, quantity = 1) => {
    try {
      // Check inventory availability
      const availability = await checkInventoryAvailability(product.id, quantity)
      
      if (!availability.available) {
        throw new Error(availability.message)
      }

      setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === product.id)
        
        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity
          
          // Check if total quantity exceeds available stock
          if (availability.availableStock < newQuantity) {
            throw new Error(`Cannot add ${quantity} more. Only ${availability.availableStock} units available.`)
          }
          
          return prevItems.map(item =>
            item.id === product.id
              ? { ...item, quantity: newQuantity }
              : item
          )
        } else {
          return [...prevItems, { ...product, quantity }]
        }
      })

      // Update inventory check for this item
      const newAvailability = await checkInventoryAvailability(product.id, quantity)
      setInventoryChecks(prev => ({
        ...prev,
        [product.id]: newAvailability
      }))

      return { success: true }
    } catch (error) {
      errorLogger.error('Failed to add to cart', error)
      throw error
    }
  }, [checkInventoryAvailability])

  // Update quantity with inventory validation
  const updateQuantity = useCallback(async (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }

    try {
      // Check inventory availability
      const availability = await checkInventoryAvailability(productId, quantity)
      
      if (!availability.available) {
        throw new Error(availability.message)
      }

      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      )

      // Update inventory check
      setInventoryChecks(prev => ({
        ...prev,
        [productId]: availability
      }))

      return { success: true }
    } catch (error) {
      errorLogger.error('Failed to update quantity', error)
      throw error
    }
  }, [checkInventoryAvailability])

  // Remove from cart
  const removeFromCart = useCallback((productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId))
    
    // Remove inventory check
    setInventoryChecks(prev => {
      const newChecks = { ...prev }
      delete newChecks[productId]
      return newChecks
    })
  }, [])

  // Clear cart
  const clearCart = useCallback(() => {
    setCartItems([])
    setInventoryChecks({})
  }, [])

  // Get cart total
  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)
  }, [cartItems])

  // Get cart items count
  const getCartItemsCount = useCallback(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }, [cartItems])

  // Check if cart has inventory issues
  const hasInventoryIssues = useCallback(() => {
    return Object.values(inventoryChecks).some(check => !check.available)
  }, [inventoryChecks])

  // Get inventory issues
  const getInventoryIssues = useCallback(() => {
    const issues = []
    
    cartItems.forEach(item => {
      const check = inventoryChecks[item.id]
      if (check && !check.available) {
        issues.push({
          productId: item.id,
          productName: item.name,
          requestedQuantity: item.quantity,
          availableStock: check.availableStock,
          message: check.message
        })
      }
    })
    
    return issues
  }, [cartItems, inventoryChecks])

  // Auto-adjust quantities to available stock
  const autoAdjustQuantities = useCallback(() => {
    const adjustments = []
    
    cartItems.forEach(item => {
      const check = inventoryChecks[item.id]
      if (check && !check.available && check.availableStock > 0) {
        // Auto-adjust to maximum available
        updateQuantity(item.id, check.availableStock)
        adjustments.push({
          productId: item.id,
          productName: item.name,
          oldQuantity: item.quantity,
          newQuantity: check.availableStock
        })
      }
    })
    
    return adjustments
  }, [cartItems, inventoryChecks, updateQuantity])

  // Reserve cart items (for checkout)
  const reserveCartItems = useCallback(async (orderId) => {
    const reservations = []
    
    for (const item of cartItems) {
      try {
        const result = await inventoryService.reserveStock(item.id, item.quantity, orderId)
        reservations.push({
          productId: item.id,
          quantity: item.quantity,
          success: true,
          result
        })
      } catch (error) {
        errorLogger.error(`Failed to reserve stock for product ${item.id}`, error)
        reservations.push({
          productId: item.id,
          quantity: item.quantity,
          success: false,
          error: error.message
        })
      }
    }
    
    return reservations
  }, [cartItems])

  // Release cart item reservations
  const releaseCartReservations = useCallback(async (orderId) => {
    const releases = []
    
    for (const item of cartItems) {
      try {
        const result = await inventoryService.releaseReservedStock(item.id, item.quantity, orderId)
        releases.push({
          productId: item.id,
          quantity: item.quantity,
          success: true,
          result
        })
      } catch (error) {
        errorLogger.error(`Failed to release stock reservation for product ${item.id}`, error)
        releases.push({
          productId: item.id,
          quantity: item.quantity,
          success: false,
          error: error.message
        })
      }
    }
    
    return releases
  }, [cartItems])

  // Validate cart items on mount and when cart changes
  useEffect(() => {
    validateCartInventory()
  }, [validateCartInventory])

  const value = {
    // State
    cartItems,
    inventoryChecks,
    checkingInventory,
    
    // Cart operations
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemsCount,
    
    // Inventory operations
    checkInventoryAvailability,
    validateCartInventory,
    reserveCartItems,
    releaseCartReservations,
    
    // Inventory status
    hasInventoryIssues,
    getInventoryIssues,
    autoAdjustQuantities,
    
    // Utility functions
    isItemAvailable: (productId) => {
      const check = inventoryChecks[productId]
      return check ? check.available : false
    },
    
    getItemAvailability: (productId) => {
      return inventoryChecks[productId] || null
    },
    
    getMaxQuantityForProduct: (productId) => {
      const check = inventoryChecks[productId]
      return check ? check.availableStock : 0
    }
  }

  return (
    <EnhancedCartContext.Provider value={value}>
      {children}
    </EnhancedCartContext.Provider>
  )
}

export default EnhancedCartProvider
