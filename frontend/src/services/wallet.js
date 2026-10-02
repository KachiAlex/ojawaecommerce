import { api } from './api';

export const walletService = {
  async createWallet(userId, userType) {
    const res = await api.request('/api/wallets', { method: 'POST', body: JSON.stringify({ userId, userType }), headers: { 'Content-Type': 'application/json' } });
    return res || null;
  },
  async getUserWallet(userId) {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}/wallet`);
    return res?.wallet || res?.data?.wallet || res || null;
  },
  async getUserTransactions(userId) {
    const params = new URLSearchParams({ limit: '50' });
    const res = await api.request(`/api/payments/wallet/transactions?${params}`);
    return res?.data?.transactions || res?.transactions || [];
  },
  async getOrderTransactions(orderId) {
    try {
      const res = await api.request(`/api/payments/wallet/transactions`);
      const transactions = res?.data?.transactions || res?.transactions || [];
      return transactions.filter(t => t.orderId === orderId || t.metadata?.orderId === orderId || t.reference === orderId);
    } catch (e) {
      console.warn('getOrderTransactions error:', e);
      return [];
    }
  },
  async topUpEscrowWallet(walletId, amount, options = {}) {
    const res = await api.request('/api/payments/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ walletId, amount, ...options }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res || null;
  },
  async releaseWallet(orderId, vendorId, amount) {
    const res = await api.request('/api/payments/escrow/release', {
      method: 'POST',
      body: JSON.stringify({ orderId, vendorId, amount }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res || null;
  },
  async transferToExternalAccount(walletId, amount, accountDetails, description) {
    const res = await api.request('/api/payments/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        bankDetails: accountDetails,
        description
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    return res || null;
  }
};
