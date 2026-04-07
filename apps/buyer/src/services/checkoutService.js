import { errorLogger } from '../utils/errorLogger';
import productService from './productService';
import cartService from './cartService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://ojawaecommerce.onrender.com';

class CheckoutService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('authToken');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      errorLogger.error('CheckoutService API Error:', {
        endpoint,
        error: error.message,
        status: error.response?.status
      });
      throw error;
    }
  }

  // Calculate shipping cost
  async calculateShipping(origin, destination, weight = 1, dimensions = {}) {
    try {
      const response = await this.request('/api/logistics/shipping-cost', {
        method: 'POST',
        body: JSON.stringify({
          origin,
          destination,
          weight,
          dimensions: {
            length: 10,
            width: 10,
            height: 10,
            ...dimensions
          }
        })
      });
      
      return response.data;
    } catch (error) {
      // Fallback to simple calculation
      return {
        shipping: {
          cost: 1000,
          type: 'standard',
          estimatedDelivery: '2-3 days'
        }
      };
    }
  }

  // Get delivery estimate
  async getDeliveryEstimate(origin, destination, deliveryType = 'standard') {
    try {
      const response = await this.request(`/api/logistics/delivery-estimate?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&deliveryType=${deliveryType}`);
      return response.data;
    } catch (error) {
      // Fallback
      return {
        deliveryEstimate: {
          estimatedDays: deliveryType === 'same_day' ? 0 : deliveryType === 'express' ? 1 : 2,
          description: deliveryType === 'same_day' ? 'Today by 6 PM' : deliveryType === 'express' ? 'Tomorrow by 4 PM' : '2-3 days'
        }
      };
    }
  }

  // Get service areas
  async getServiceAreas() {
    try {
      const response = await this.request('/api/logistics/service-areas');
      return response.data;
    } catch (error) {
      // Fallback service areas
      return [
        {
          id: 'lagos_mainland',
          name: 'Lagos Mainland',
          cities: ['Ikeja', 'Surulere', 'Yaba', 'Maryland'],
          baseCost: 500
        },
        {
          id: 'lagos_island',
          name: 'Lagos Island',
          cities: ['Victoria Island', 'Lekki', 'Ikoyi'],
          baseCost: 600
        }
      ];
    }
  }

  // Create order from cart
  async createOrder(orderData) {
    const response = await this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
    
    return response.data;
  }

  // Initialize payment
  async initializePayment(paymentData) {
    const response = await this.request('/api/payments/escrow/create', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
    
    return response.data;
  }

  // Get wallet balance
  async getWalletBalance() {
    const response = await this.request('/api/payments/wallet/balance');
    return response.data;
  }

  // Process checkout
  async processCheckout(checkoutData) {
    try {
      const { items, shippingAddress, paymentMethod, deliveryType } = checkoutData;
      
      // Calculate order total
      const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
      const shipping = await this.calculateShipping(
        shippingAddress.city || 'Lagos',
        shippingAddress.city || 'Lagos',
        this.calculateTotalWeight(items)
      );
      
      const total = subtotal + (shipping.shipping?.cost || 0);
      
      // Create order
      const orderData = {
        items: items.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          variant: item.variant
        })),
        shippingAddress,
        deliveryType: deliveryType || 'standard',
        paymentMethod,
        subtotal,
        shippingCost: shipping.shipping?.cost || 0,
        total,
        status: 'pending'
      };
      
      const order = await this.createOrder(orderData);
      
      // Initialize payment if using escrow
      if (paymentMethod === 'escrow') {
        const payment = await this.initializePayment({
          orderId: order.id,
          amount: total,
          email: checkoutData.email
        });
        
        return {
          success: true,
          order,
          payment,
          nextStep: 'payment'
        };
      }
      
      return {
        success: true,
        order,
        nextStep: 'confirmation'
      };
      
    } catch (error) {
      errorLogger.error('Checkout failed:', error);
      throw error;
    }
  }

  // Calculate total weight of items
  calculateTotalWeight(items) {
    return items.reduce((total, item) => {
      const itemWeight = item.weight || 1; // Default 1kg per item
      return total + (itemWeight * item.quantity);
    }, 0);
  }

  // Validate checkout data
  validateCheckoutData(checkoutData) {
    const errors = [];
    
    if (!checkoutData.items || checkoutData.items.length === 0) {
      errors.push('Cart is empty');
    }
    
    if (!checkoutData.shippingAddress) {
      errors.push('Shipping address is required');
    } else {
      const { fullName, phone, address, city, state } = checkoutData.shippingAddress;
      if (!fullName) errors.push('Full name is required');
      if (!phone) errors.push('Phone number is required');
      if (!address) errors.push('Address is required');
      if (!city) errors.push('City is required');
      if (!state) errors.push('State is required');
    }
    
    if (!checkoutData.paymentMethod) {
      errors.push('Payment method is required');
    }
    
    if (!checkoutData.email) {
      errors.push('Email is required');
    }
    
    return errors;
  }

  // Get order summary
  getOrderSummary(items, shippingAddress, deliveryType = 'standard') {
    const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    
    // Calculate shipping (simplified for now)
    const shippingCost = subtotal > 10000 ? 0 : 1000;
    
    // Calculate tax
    const tax = subtotal * 0.075; // 7.5% VAT
    
    const total = subtotal + shippingCost + tax;
    
    return {
      items: itemCount,
      subtotal,
      shippingCost,
      tax,
      total,
      currency: 'NGN'
    };
  }

  // Get available payment methods
  getPaymentMethods() {
    return [
      {
        id: 'escrow',
        name: 'Escrow Payment',
        description: 'Secure payment held until delivery confirmation',
        icon: 'shield',
        fee: 0,
        processingTime: 'Instant'
      },
      {
        id: 'wallet',
        name: 'Wallet Payment',
        description: 'Pay from your Ojawa wallet balance',
        icon: 'wallet',
        fee: 0,
        processingTime: 'Instant'
      },
      {
        id: 'paystack',
        name: 'Paystack',
        description: 'Pay with card, bank transfer, or USSD',
        icon: 'card',
        fee: 0.015, // 1.5%
        processingTime: 'Instant'
      }
    ];
  }

  // Get delivery options
  getDeliveryOptions() {
    return [
      {
        id: 'standard',
        name: 'Standard Delivery',
        description: '2-3 business days',
        cost: 1000,
        estimatedDays: '2-3 days'
      },
      {
        id: 'express',
        name: 'Express Delivery',
        description: 'Next business day',
        cost: 2000,
        estimatedDays: '1-2 days'
      },
      {
        id: 'same_day',
        name: 'Same Day Delivery',
        description: 'Order before 12 PM',
        cost: 3000,
        estimatedDays: 'Same day'
      }
    ];
  }
}

// Create singleton instance
const checkoutService = new CheckoutService();

export default checkoutService;
