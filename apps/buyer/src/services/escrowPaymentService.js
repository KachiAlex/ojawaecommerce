import firebaseService from './firebaseService';

// Escrow payment service for wallet-based transactions
export const escrowPaymentService = {
  // Process escrow payment
  async processEscrowPayment(orderData) {
    try {
      const { buyerId, totalAmount, orderId } = orderData;
      
      // Get user's wallet
      const wallet = await firebaseService.wallet.getUserWallet(buyerId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }
      
      if (wallet.balance < totalAmount) {
        throw new Error('Insufficient wallet balance');
      }
      
      // Deduct funds from buyer's wallet and hold in escrow
      await firebaseService.wallet.deductFunds(
        wallet.id,
        totalAmount,
        orderId,
        `Escrow payment for order ${orderId}`
      );
      
      return {
        success: true,
        transactionId: `ESCROW-${Date.now()}`,
        escrowAmount: totalAmount,
        status: 'funds_held_in_escrow'
      };
    } catch (error) {
      console.error('Escrow payment failed:', error);
      throw error;
    }
  },

  // Release escrow funds to vendor
  async releaseEscrowFunds(orderId, buyerId, vendorId, amount) {
    try {
      // Release funds from escrow to vendor
      await firebaseService.wallet.releaseWallet(orderId, vendorId, amount);
      
      return {
        success: true,
        releasedAmount: amount,
        status: 'funds_released_to_vendor'
      };
    } catch (error) {
      console.error('Escrow release failed:', error);
      throw error;
    }
  },

  // Refund escrow funds to buyer
  async refundEscrowFunds(orderId, buyerId, amount) {
    try {
      // Get buyer's wallet
      const wallet = await firebaseService.wallet.getUserWallet(buyerId);
      if (!wallet) {
        throw new Error('Buyer wallet not found');
      }
      
      // Add funds back to buyer's wallet
      await firebaseService.wallet.addFunds(
        wallet.id,
        amount,
        `REFUND-${Date.now()}`,
        `Refund for order ${orderId}`
      );
      
      return {
        success: true,
        refundedAmount: amount,
        status: 'funds_refunded_to_buyer'
      };
    } catch (error) {
      console.error('Escrow refund failed:', error);
      throw error;
    }
  },

  // Get escrow status
  async getEscrowStatus(orderId) {
    try {
      const order = await firebaseService.orders.getById(orderId);
      return {
        orderId,
        escrowStatus: order.escrowStatus || 'unknown',
        escrowAmount: order.escrowAmount || 0,
        paymentStatus: order.paymentStatus || 'unknown'
      };
    } catch (error) {
      console.error('Failed to get escrow status:', error);
      throw error;
    }
  }
};

export default escrowPaymentService;
