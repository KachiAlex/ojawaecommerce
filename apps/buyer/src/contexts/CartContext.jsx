import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import secureStorage from '../utils/secureStorage';
import { useAuth } from './AuthContext';
import { pricingService } from '../services/pricingService';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const { currentUser } = useAuth();

  // Load cart (encrypted) on mount
  useEffect(() => {
    (async () => {
      const savedCart = await secureStorage.getItem('cart');
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch (error) {
          console.error('Error loading cart from secure storage:', error);
        }
      }
    })();
  }, []);

  // After auth resolves, attempt a second load (in case initial load used guest key)
  useEffect(() => {
    (async () => {
      if (!currentUser) return;
      if (cartItems.length > 0) return;
      const savedCart = await secureStorage.getItem('cart');
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch (error) {
          console.error('Error loading cart after auth:', error);
        }
      }
    })();
    // Only run when currentUser becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Save intended destination for post-authentication redirect
  const saveIntendedDestination = useCallback((path, productId = null) => {
    const destination = {
      path,
      productId,
      timestamp: Date.now(),
      cartItems: cartItems.length
    };
    localStorage.setItem('intendedDestination', JSON.stringify(destination));
  }, [cartItems.length]);

  // Get and clear intended destination
  const getIntendedDestination = useCallback(() => {
    const saved = localStorage.getItem('intendedDestination');
    if (saved) {
      try {
        const destination = JSON.parse(saved);
        // Clear after 1 hour to prevent stale redirects
        if (Date.now() - destination.timestamp < 3600000) {
          localStorage.removeItem('intendedDestination');
          return destination;
        }
      } catch (error) {
        console.error('Error parsing intended destination:', error);
      }
    }
    return null;
  }, []);

  // Save cart (encrypted) whenever it changes
  useEffect(() => {
    (async () => {
      await secureStorage.setItem('cart', JSON.stringify(cartItems));
    })();
  }, [cartItems]);

  const addToCart = useCallback((product, quantity = 1) => {
    // Stock validation
    const isOutOfStock = product.inStock === false || (product.stock || product.stockQuantity || 0) <= 0;
    if (isOutOfStock) {
      throw new Error('This product is out of stock and cannot be added to cart.');
    }

    // Check if adding this quantity would exceed available stock
    const availableStock = product.stock || product.stockQuantity || 0;
    
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      const currentQuantity = existingItem ? existingItem.quantity : 0;
      
      if (currentQuantity + quantity > availableStock) {
        throw new Error(`Only ${availableStock} items available in stock. You already have ${currentQuantity} in your cart.`);
      }
      
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Normalize product snapshot for cart storage to avoid UI flicker
        const normalized = {
          ...product,
          image: product?.image || (Array.isArray(product?.images) ? product.images[0] : undefined) || '/placeholder-product.jpg',
        };
        return [...prevItems, { ...normalized, quantity }];
      }
    });
    // Fire a lightweight global event for UI toasts (no backend write)
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cart:add', { detail: { id: product?.id, name: product?.name, quantity } }));
      }
    } catch (_) {}
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
      return;
    }

    setCartItems(prevItems => {
      const product = prevItems.find(item => item.id === productId);
      if (product) {
        const availableStock = product.stock || product.stockQuantity || 0;
        if (quantity > availableStock) {
          throw new Error(`Only ${availableStock} items available in stock.`);
        }
      }
      
      return prevItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      );
    });
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cartItems]);

  // Get comprehensive pricing breakdown including VAT, service fee, and logistics
  const getPricingBreakdown = async (deliveryOption = 'pickup', selectedLogistics = null) => {
    try {
      return await pricingService.calculatePricingBreakdown(cartItems, deliveryOption, selectedLogistics);
    } catch (error) {
      console.error('Error calculating pricing breakdown:', error);
      // Fallback to basic calculation
      const subtotal = getCartTotal();
      return {
        subtotal,
        vatAmount: 0,
        serviceFeeAmount: 0,
        logisticsFee: 0,
        logisticsDetails: null,
        discountAmount: 0,
        total: subtotal,
        breakdown: {
          subtotal: { label: 'Subtotal', amount: subtotal, description: 'Sum of all items' },
          total: { label: 'Total', amount: subtotal, description: 'Final amount to be paid' }
        }
      };
    }
  };

  // Get simple cart total (for backward compatibility)
  const getSimpleCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Validate and clean up cart items (remove out of stock items)
  const validateCartItems = () => {
    setCartItems(prevItems => {
      const validItems = prevItems.filter(item => {
        const isOutOfStock = item.inStock === false || (item.stock || item.stockQuantity || 0) <= 0;
        return !isOutOfStock;
      });
      
      // If any items were removed, show notification
      if (validItems.length < prevItems.length) {
        const removedCount = prevItems.length - validItems.length;
        console.warn(`${removedCount} out-of-stock item(s) removed from cart`);
      }
      
      return validItems;
    });
  };

  // Check if cart has any out of stock items
  const hasOutOfStockItems = () => {
    return cartItems.some(item => {
      return item.inStock === false || (item.stock || item.stockQuantity || 0) <= 0;
    });
  };

  const value = useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getSimpleCartTotal,
    getPricingBreakdown,
    getCartItemsCount,
    validateCartItems,
    hasOutOfStockItems,
    saveIntendedDestination,
    getIntendedDestination
  }), [
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    saveIntendedDestination,
    getIntendedDestination
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
