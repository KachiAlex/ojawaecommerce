// Checkout Service - Handle order creation and payment processing

const API_BASE = 'https://ojawaecommerce.onrender.com';

class CheckoutService {
  // Validate checkout data before creating order
  static async validateCheckout(items, shippingAddress, paymentMethod) {
    try {
      const response = await fetch(`${API_BASE}/api/checkout/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          items,
          shippingAddress,
          paymentMethod
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Checkout validation error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create order from cart
  static async createOrder(items, shippingAddress, paymentMethod, deliveryOption = 'standard') {
    try {
      const response = await fetch(`${API_BASE}/api/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          items,
          shippingAddress,
          paymentMethod,
          deliveryOption
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Create order error:', error);
      return { success: false, error: error.message };
    }
  }

  // Process payment for order
  static async processPayment(orderId, paymentMethod, paymentDetails) {
    try {
      const response = await fetch(`${API_BASE}/api/checkout/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          orderId,
          paymentMethod,
          paymentDetails
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Payment processing error:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate order totals
  static calculateTotals(items, shippingCost = 0, tax = 0) {
    const subtotal = items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    const total = subtotal + shippingCost + tax;

    return {
      subtotal,
      shippingCost,
      tax,
      total,
      itemCount: items.reduce((count, item) => count + item.quantity, 0)
    };
  }

  // Get shipping options
  static async getShippingOptions(address) {
    try {
      const response = await fetch(`${API_BASE}/api/shipping/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ address })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get shipping options error:', error);
      // Return default options
      return {
        success: true,
        data: {
          options: [
            {
              id: 'standard',
              name: 'Standard Delivery',
              estimatedDays: '3-5 business days',
              cost: 500
            },
            {
              id: 'express',
              name: 'Express Delivery',
              estimatedDays: '1-2 business days',
              cost: 1500
            }
          ]
        }
      };
    }
  }

  // Validate shipping address
  static validateShippingAddress(address) {
    const required = ['street', 'city', 'state', 'country', 'postalCode'];
    const missing = required.filter(field => !address[field] || address[field].trim() === '');
    
    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing required fields: ${missing.join(', ')}`
      };
    }

    return { valid: true };
  }

  // Format order confirmation data
  static formatOrderConfirmation(orderData) {
    return {
      orderId: orderData.orderId,
      status: orderData.status,
      items: orderData.items,
      shippingAddress: orderData.shippingAddress,
      paymentMethod: orderData.paymentMethod,
      totals: orderData.totals,
      estimatedDelivery: orderData.estimatedDelivery,
      createdAt: orderData.createdAt
    };
  }

  // Get order status
  static async getOrderStatus(orderId) {
    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get order status error:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancel order
  static async cancelOrder(orderId, reason) {
    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Cancel order error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default CheckoutService;
