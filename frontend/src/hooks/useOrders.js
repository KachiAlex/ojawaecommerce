import { useState, useEffect, useCallback } from 'react';
import { orderService } from '../services/orders';
import { authService } from '../services/auth';
import { toJsDate } from '../utils/dateUtils';

export const normalizeOrder = (order) => ({
  ...order,
  vendorName: order.vendorName || order.vendor?.name || order.vendor?.displayName ||
    order.items?.find(it => it.vendorName)?.vendorName || 'Unknown Vendor',
  createdAt: order.createdAt ? { toDate: () => new Date(order.createdAt) } : null,
  updatedAt: order.updatedAt ? { toDate: () => new Date(order.updatedAt) } : null,
  items: Array.isArray(order.items) ? order.items : [],
});

export function useOrders(userId, type = 'buyer') {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);

      const ordersData = await orderService.getByUser(userId, type);
      const normalizedOrders = (ordersData || []).map(normalizeOrder);

      // Fetch vendor names
      const vendorIds = [...new Set(normalizedOrders.map(o => o.vendorId).filter(Boolean))];
      const vendorMap = {};
      await Promise.all(vendorIds.map(async (vid) => {
        try {
          const vData = await authService.getProfile(vid);
          const u = vData?.user || vData;
          if (u) {
            vendorMap[vid] = u.displayName || u.storeName || u.vendorProfile?.storeName ||
              [u.firstName, u.lastName].filter(Boolean).join(' ') ||
              u.name || u.businessName || 'Unknown Vendor';
          }
        } catch { vendorMap[vid] = 'Unknown Vendor'; }
      }));

      const ordersWithVendors = normalizedOrders.map(o => ({
        ...o,
        vendorName: vendorMap[o.vendorId] || o.vendorName || 'Unknown Vendor',
      }));
      setOrders(ordersWithVendors);

      // Build vendors list
      const vendorStats = {};
      ordersWithVendors.forEach(o => {
        const vid = o.vendorId;
        if (!vid) return;
        if (!vendorStats[vid]) {
          vendorStats[vid] = {
            id: vid,
            name: vendorMap[vid] || 'Unknown Vendor',
            orders: 0,
            totalSpent: 0,
            rating: 0,
            lastOrder: null,
            verified: false,
          };
        }
        vendorStats[vid].orders += 1;
        vendorStats[vid].totalSpent += Number(o.totalAmount || 0);
        const orderDate = toJsDate(o.createdAt);
        if (orderDate && (!vendorStats[vid].lastOrder || orderDate > new Date(vendorStats[vid].lastOrder))) {
          vendorStats[vid].lastOrder = orderDate.toISOString();
        }
      });

      // Fetch vendor profiles for ratings/verification
      await Promise.all(Object.keys(vendorStats).map(async (vid) => {
        try {
          const vData = await authService.getProfile(vid);
          if (vData) {
            vendorStats[vid].rating = vData.rating || vData.vendorRating || 0;
            vendorStats[vid].verified = vData.verified || vData.isVerified || false;
            vendorStats[vid].name = vData.displayName || vData.name || vData.businessName || vendorStats[vid].name;
          }
        } catch {}
      }));

      const vendorsList = Object.values(vendorStats).map(v => ({
        ...v,
        totalSpent: '\u20a6' + v.totalSpent.toLocaleString(),
        lastOrder: v.lastOrder ? new Date(v.lastOrder).toLocaleDateString() : 'N/A',
      }));
      setVendors(vendorsList);

    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err);
      setOrders([]);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [userId, type]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const refresh = useCallback(() => {
    return fetchOrders();
  }, [fetchOrders]);

  return { orders, setOrders, vendors, loading, error, refresh };
}
