import { useMemo } from 'react';

export function useBuyerStats(userId, orders = [], vendors = []) {
  const stats = useMemo(() => {
    const activeOrders = orders.filter(o =>
      ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)
    ).length;
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    return {
      activeOrders,
      totalOrders: orders.length,
      totalSpent,
      pending: orders.filter(o => o.status === 'pending' || o.orderStatus === 'pending').length,
      completed: orders.filter(o => o.status === 'completed' || o.status === 'delivered').length,
      trustedVendors: vendors.length,
      avgRating: vendors.length > 0
        ? (vendors.reduce((sum, v) => sum + (v.rating || 0), 0) / vendors.length).toFixed(1)
        : '0.0',
    };
  }, [orders, vendors]);

  return { stats, setStats: () => {} };
}
