// Flutterwave Subscription Payment Integration
import { loadScript } from './loadScript';
import { config } from '../config/env';

class FlutterwaveSubscription {
  constructor() {
    this.baseUrl = 'https://api.flutterwave.com/v3';
    
    // Try multiple sources for public key (same as flutterwave.js)
    // Priority: env variables > config file
    this.publicKey = process.env.REACT_APP_FLUTTERWAVE_PUBLIC_KEY || 
                     process.env.VITE_FLUTTERWAVE_PUBLIC_KEY ||
                     import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY ||
                     config?.payments?.flutterwave?.publicKey;
    
    this.secretKey = process.env.REACT_APP_FLUTTERWAVE_SECRET_KEY ||
                     process.env.VITE_FLUTTERWAVE_SECRET_KEY ||
                     import.meta.env.VITE_FLUTTERWAVE_SECRET_KEY ||
                     config?.payments?.flutterwave?.secretKey;
    
    if (!this.publicKey) {
      console.warn('⚠️ Flutterwave public key not found. Payment will not work.');
      console.warn('⚠️ Check environment variables or config file for VITE_FLUTTERWAVE_PUBLIC_KEY');
    } else {
      console.log('✅ Flutterwave public key loaded:', this.publicKey.substring(0, 20) + '...');
    }
  }
  
  // Get public key (always return the configured key)
  getPublicKey() {
    return this.publicKey;
  }

  // Initialize Flutterwave
  async initialize() {
    try {
      // Check if already loaded
      if (window.FlutterwaveCheckout) {
        console.log('✅ FlutterwaveCheckout already available');
        return window.FlutterwaveCheckout;
      }
      
      console.log('📥 Loading Flutterwave script...');
      await loadScript('https://checkout.flutterwave.com/v3.js');
      
      if (!window.FlutterwaveCheckout) {
        throw new Error('FlutterwaveCheckout not available after loading script');
      }
      
      console.log('✅ FlutterwaveCheckout loaded successfully');
      return window.FlutterwaveCheckout;
    } catch (error) {
      console.error('❌ Error loading Flutterwave:', error);
      throw error;
    }
  }

  // Process subscription payment
  async processSubscriptionPayment(subscriptionData) {
    try {
      // Get public key
      const publicKey = this.getPublicKey();
      if (!publicKey) {
        console.error('❌ Flutterwave public key not configured');
        console.error('❌ Config:', config?.payments?.flutterwave);
        console.error('❌ Env VITE_FLUTTERWAVE_PUBLIC_KEY:', import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY);
        throw new Error('Flutterwave public key not configured. Please set VITE_FLUTTERWAVE_PUBLIC_KEY in your environment variables or config file.');
      }
      
      const FlutterwaveCheckout = await this.initialize();
      
      const {
        plan,
        price,
        userEmail,
        userName,
        userId,
        planName
      } = subscriptionData;

      const paymentData = {
        public_key: publicKey,
        tx_ref: `SUB_${Date.now()}_${userId}`,
        amount: price,
        currency: 'NGN',
        payment_options: 'card,mobilemoney,ussd',
        redirect_url: `${window.location.origin}/vendor?tab=billing&payment=success&plan=${plan}`,
        customer: {
          email: userEmail,
          name: userName,
        },
        customizations: {
          title: 'Ojawa Subscription Payment',
          description: `${planName} Plan Subscription`,
          logo: `${window.location.origin}/logos/ojawa-logo.png`,
        },
        meta: {
          subscription_plan: plan,
          user_id: userId,
          payment_type: 'subscription'
        }
      };

      return new Promise((resolve, reject) => {
        console.log('💳 Opening Flutterwave checkout modal...', {
          public_key: publicKey ? 'Set' : 'Missing',
          amount: paymentData.amount,
          currency: paymentData.currency,
          redirect_url: paymentData.redirect_url
        });
        
        try {
          // Open Flutterwave checkout modal - this is non-blocking
          // With redirect_url, Flutterwave will redirect user after payment
          // The promise resolves when payment is successful (before redirect)
          // Or rejects if user closes modal
          FlutterwaveCheckout({
            ...paymentData,
            callback: function(response) {
              console.log('💳 Flutterwave callback received:', response);
              // This callback fires when payment is successful (before redirect)
              // But with redirect_url, this may not fire - redirect happens instead
              if (response.status === 'successful' || response.status === 'completed') {
                resolve({
                  success: true,
                  transactionId: response.transaction_id || response.id,
                  txRef: response.tx_ref,
                  amount: response.amount,
                  currency: response.currency,
                  status: response.status
                });
              } else {
                reject(new Error(`Payment failed: ${response.message || 'Unknown error'}`));
              }
            },
            onclose: function() {
              console.log('💳 Flutterwave modal closed by user');
              reject(new Error('Payment cancelled by user'));
            }
          });
          
          console.log('✅ Flutterwave checkout modal opened successfully');
          // Modal is now open - the promise will resolve/reject based on user action
          // With redirect_url, user will be redirected after payment, so callback may not fire
        } catch (error) {
          console.error('❌ Error opening Flutterwave checkout:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error processing subscription payment:', error);
      throw error;
    }
  }

  // Verify payment
  async verifyPayment(transactionId) {
    try {
      const secretKey = this.secretKey || config?.payments?.flutterwave?.secretKey || process.env.REACT_APP_FLUTTERWAVE_SECRET_KEY || import.meta.env.VITE_FLUTTERWAVE_SECRET_KEY;
      
      if (!secretKey) {
        throw new Error('Flutterwave secret key not configured for payment verification');
      }
      
      const response = await fetch(`${this.baseUrl}/transactions/${transactionId}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.status === 'success' && data.data.status === 'successful') {
        return {
          success: true,
          transactionId: data.data.id,
          amount: data.data.amount,
          currency: data.data.currency,
          customer: data.data.customer,
          meta: data.data.meta
        };
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  // Create subscription record
  async createSubscriptionRecord(paymentData, subscriptionData) {
    try {
      const subscriptionRecord = {
        userId: subscriptionData.userId,
        plan: subscriptionData.plan,
        price: subscriptionData.price,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        paymentMethod: 'flutterwave',
        paymentId: paymentData.transactionId,
        txRef: paymentData.txRef,
        commissionRate: subscriptionData.commissionRate,
        productLimit: subscriptionData.productLimit,
        analyticsLevel: subscriptionData.analyticsLevel,
        supportLevel: subscriptionData.supportLevel,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to Firebase
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');
      
      const docRef = await addDoc(collection(db, 'subscriptions'), {
        ...subscriptionRecord,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating subscription record:', error);
      throw error;
    }
  }

  // Handle subscription upgrade
  async upgradeSubscription(currentSubscription, newPlan, userData) {
    try {
      const planPricing = {
        basic: { price: 0, commission: 5.0, productLimit: 50 },
        pro: { price: 5000, commission: 3.0, productLimit: 500 },
        premium: { price: 15000, commission: 2.0, productLimit: -1 }
      };

      const newPlanData = planPricing[newPlan];
      const priceDifference = newPlanData.price - (planPricing[currentSubscription.plan]?.price || 0);

      if (priceDifference <= 0) {
        // Downgrade or same price - no payment needed
        return await this.updateSubscription(currentSubscription.id, {
          plan: newPlan,
          commissionRate: newPlanData.commission,
          productLimit: newPlanData.productLimit,
          updatedAt: new Date()
        });
      }

      // Upgrade requires payment
      const paymentData = await this.processSubscriptionPayment({
        plan: newPlan,
        price: priceDifference,
        userEmail: userData.email,
        userName: userData.displayName,
        userId: userData.uid,
        planName: newPlan.charAt(0).toUpperCase() + newPlan.slice(1)
      });

      // Update subscription
      return await this.updateSubscription(currentSubscription.id, {
        plan: newPlan,
        commissionRate: newPlanData.commission,
        productLimit: newPlanData.productLimit,
        paymentId: paymentData.transactionId,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      throw error;
    }
  }

  // Update subscription
  async updateSubscription(subscriptionId, updates) {
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');
      
      const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
      await updateDoc(subscriptionRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }
}

export default new FlutterwaveSubscription();
