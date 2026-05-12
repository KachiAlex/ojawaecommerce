import { errorLogger } from '../utils/errorLogger';
import productService from './productService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://ojawaecommerce.onrender.com';

class CartService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.cartItems = this.loadCartFromStorage();
    this.listeners = [];
  }

  // Load cart from localStorage
  loadCartFromStorage() {
    try {
      const stored = localStorage.getItem('ojawa_cart');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      errorLogger.error('Failed to load cart from storage:', error);
      return [];
    }
  }

  // Save cart to localStorage
  saveCartToStorage() {
    try {
      localStorage.setItem('ojawa_cart', JSON.stringify(this.cartItems));
      this.notifyListeners();
    } catch (error) {
      errorLogger.error('Failed to save cart to storage:', error);
    }
  }

  // Subscribe to cart changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.getCartState()));
  }

  // Get current cart state
  getCartState() {
    return {
      items: this.cartItems,
      itemCount: this.getItemCount(),
      subtotal: this.getSubtotal(),
      total: this.getTotal()
    };
  }

  // Get item count
  getItemCount() {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  // Get subtotal
  getSubtotal() {
    return this.cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  // Get total (including shipping, taxes, etc.)
  getTotal() {
    const subtotal = this.getSubtotal();
    const shipping = this.calculateShipping();
    const tax = this.calculateTax(subtotal);
    return subtotal + shipping + tax;
  }

  // Calculate shipping (simplified)
  calculateShipping() {
    return this.getSubtotal() > 10000 ? 0 : 1000; // Free shipping over 10,000
  }

  // Calculate tax (simplified)
  calculateTax(subtotal) {
    return subtotal * 0.075; // 7.5% VAT
  }

  // Add item to cart
  async addToCart(product, quantity = 1, variant = null) {
    try {
      // Check if item already exists
      const existingItemIndex = this.cartItems.findIndex(
        item => item.id === product.id && (!variant || item.variant === variant)
      );

      if (existingItemIndex > -1) {
        // Update quantity
        this.cartItems[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        const cartItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.images?.[0] || product.image,
          vendor: product.vendorName || product.vendor,
          category: product.category,
          quantity,
          variant,
          addedAt: new Date().toISOString()
        };

        this.cartItems.push(cartItem);
      }

      this.saveCartToStorage();

      // Try to sync with backend
      try {
        await productService.addToCart(product.id, quantity, variant);
      } catch (error) {
        errorLogger.warn('Failed to sync cart with backend:', error);
        // Continue with local cart even if backend sync fails
      }

      return { success: true, message: 'Item added to cart' };
    } catch (error) {
      errorLogger.error('Failed to add item to cart:', error);
      return { success: false, error: error.message };
    }
  }

  // Update item quantity
  async updateItemQuantity(itemId, quantity) {
    try {
      const itemIndex = this.cartItems.findIndex(item => 
        item.id === itemId || item.cartItemId === itemId
      );

      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }

      if (quantity <= 0) {
        this.cartItems.splice(itemIndex, 1);
      } else {
        this.cartItems[itemIndex].quantity = quantity;
      }

      this.saveCartToStorage();

      // Try to sync with backend
      try {
        await productService.updateCartItem(itemId, quantity);
      } catch (error) {
        errorLogger.warn('Failed to sync cart update with backend:', error);
      }

      return { success: true, message: 'Cart updated' };
    } catch (error) {
      errorLogger.error('Failed to update cart quantity:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove item from cart
  async removeFromCart(itemId) {
    try {
      const itemIndex = this.cartItems.findIndex(item => 
        item.id === itemId || item.cartItemId === itemId
      );

      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }

      this.cartItems.splice(itemIndex, 1);
      this.saveCartToStorage();

      // Try to sync with backend
      try {
        await productService.removeFromCart(itemId);
      } catch (error) {
        errorLogger.warn('Failed to sync cart removal with backend:', error);
      }

      return { success: true, message: 'Item removed from cart' };
    } catch (error) {
      errorLogger.error('Failed to remove item from cart:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear cart
  async clearCart() {
    try {
      this.cartItems = [];
      this.saveCartToStorage();

      // Try to sync with backend
      try {
        await productService.clearCart();
      } catch (error) {
        errorLogger.warn('Failed to sync cart clear with backend:', error);
      }

      return { success: true, message: 'Cart cleared' };
    } catch (error) {
      errorLogger.error('Failed to clear cart:', error);
      return { success: false, error: error.message };
    }
  }

  // Get cart items
  getItems() {
    return [...this.cartItems];
  }

  // Check if item is in cart
  isInCart(productId, variant = null) {
    return this.cartItems.some(item => 
      item.id === productId && (!variant || item.variant === variant)
    );
  }

  // Get item quantity
  getItemQuantity(productId, variant = null) {
    const item = this.cartItems.find(item => 
      item.id === productId && (!variant || item.variant === variant)
    );
    return item ? item.quantity : 0;
  }

  // Merge with backend cart
  async syncWithBackend() {
    try {
      // Only sync with backend if user is authenticated
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('User not authenticated, skipping backend cart sync');
        return;
      }

      const backendCart = await productService.getCart();
      
      if (backendCart.items && backendCart.items.length > 0) {
        // Merge backend cart with local cart
        const mergedItems = [...this.cartItems];
        
        backendCart.items.forEach(backendItem => {
          const existingIndex = mergedItems.findIndex(
            localItem => localItem.id === backendItem.productId
          );
          
          if (existingIndex > -1) {
            // Update quantity with backend version
            mergedItems[existingIndex].quantity = backendItem.quantity;
          } else {
            // Add backend item to local cart
            mergedItems.push({
              id: backendItem.productId,
              cartItemId: backendItem.id,
              name: backendItem.product?.name,
              price: backendItem.product?.price,
              image: backendItem.product?.images?.[0],
              vendor: backendItem.product?.vendorName,
              quantity: backendItem.quantity,
              addedAt: backendItem.createdAt
            });
          }
        });
        
        this.cartItems = mergedItems;
        this.saveCartToStorage();
      }
    } catch (error) {
      errorLogger.warn('Failed to sync cart with backend:', error);
    }
  }
}

// Create singleton instance
const cartService = new CartService();

export default cartService;
