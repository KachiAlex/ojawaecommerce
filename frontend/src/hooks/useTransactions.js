import { useState, useEffect, useCallback } from 'react';
import { walletService } from '../services/wallet';

const TRANSACTION_TYPE_LABELS = {
  topup: 'Wallet Top-Up',
  payment: 'Purchase Payment',
  escrow_release: 'Escrow Release',
  withdrawal: 'Withdrawal',
  refund: 'Refund',
  withdrawal_refund: 'Withdrawal Refund',
};

export const normalizeTransaction = (txn) => {
  const rawAmount = Number(txn.amount || 0);
  const isPositive = rawAmount > 0;
  return {
    ...txn,
    id: txn.id || txn.reference || ('TXN-' + Math.random().toString(36).slice(2)),
    date: txn.createdAt ? new Date(txn.createdAt).toLocaleString() : 'Unknown',
    order: txn.orderId || txn.metadata?.orderId || 'N/A',
    amount: (isPositive ? '+' : '-') + '\u20a6' + Math.abs(rawAmount).toLocaleString(),
    rawAmount,
    isPositive,
    typeLabel: TRANSACTION_TYPE_LABELS[txn.type] || txn.type || 'Transaction',
    description: txn.description || txn.metadata?.description || '',
    status: txn.status || 'completed',
  };
};

export function useTransactions(userId) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await walletService.getUserTransactions(userId);
      setTransactions((data || []).map(normalizeTransaction));
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const refresh = useCallback(() => {
    return fetchTransactions();
  }, [fetchTransactions]);

  return { transactions, setTransactions, loading, error, refresh };
}
