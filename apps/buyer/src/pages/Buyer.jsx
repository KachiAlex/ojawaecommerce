import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import WalletManager from '../components/WalletManager';
import OrdersFilterBar from '../components/OrdersFilterBar';
import OrderDetailsModal from '../components/OrderDetailsModal';
import WalletTopUpModal from '../components/WalletTopUpModal';
import VendorReviewModal from '../components/VendorReviewModal';
import OrderConfirmationModal from '../components/OrderConfirmationModal';
import ProductCard from '../components/ProductCard';
import WishlistButton from '../components/WishlistButton';
import { ProductListSkeleton } from '../components/SkeletonLoaders';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Currency formatting helper
const formatCurrency = (amount, currencyValue) => {
  const numAmount = parseFloat(amount) || 0;
  if (!currencyValue) return `₦${numAmount.toLocaleString()}`;
  
  // Extract currency symbol and code from string like "₦ NGN"
  const parts = String(currencyValue).trim().split(/\s+/);
  const symbol = parts[0] || '₦';
  const code = parts[1] || 'NGN';
  
  return `${symbol}${numAmount.toLocaleString()}`;
};

const Buyer = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const [filters, setFilters] = useState({ status: '', vendor: '', from: '', to: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isWalletTopUpOpen, setIsWalletTopUpOpen] = useState(false);
  const [reviewVendor, setReviewVendor] = useState(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isOrderConfirmationOpen, setIsOrderConfirmationOpen] = useState(false);
  const [orderToConfirm, setOrderToConfirm] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  useEffect(() => {
    const fetchBuyerData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch real orders
        const ordersData = await firebaseService.orders.getByUser(currentUser.uid, 'buyer');
        setOrders(ordersData);
        
        // Fetch wallet transactions
        const transactionsData = await firebaseService.wallet.getUserTransactions(currentUser.uid);
        setTransactions(transactionsData);
        
        // Fetch purchased vendors
        const vendorsData = await firebaseService.users.getPurchasedVendors(currentUser.uid);
        setVendors(vendorsData);
        
        // Fetch buyer analytics
        const statsData = await firebaseService.analytics.getBuyerStats(currentUser.uid);
        setStats(statsData);
        
      } catch (error) {
        console.error('Error fetching buyer data:', error);
        // Fallback to mock data for demo
        setOrders([
          { id: 'ORD-2001', items: [{ name: 'Bespoke Suit' }], vendorName: 'Lagos Tailors', status: 'wallet_funded', totalAmount: 120000, createdAt: { toDate: () => new Date('2025-09-03') }, walletId: 'WAL-2001' },
        ]);
        setTransactions([
          { id: 'TXN-001', type: 'wallet_funding', orderId: 'ORD-2001', amount: 120000, createdAt: { toDate: () => new Date('2025-09-03') }, status: 'completed' },
        ]);
        setVendors([]);
        setStats({ totalSpent: 120000, activeOrders: 1, totalOrders: 1 });
      } finally {
        setLoading(false);
      }
    };

    fetchBuyerData();
  }, [currentUser]);

  // Fetch wishlist when user switches to wishlist tab
  useEffect(() => {
    if (activeTab === 'wishlist' && currentUser) {
      loadWishlist();
    }
  }, [activeTab, currentUser]);

  // Listen for wishlist updates from WishlistButton component
  useEffect(() => {
    const handleWishlistUpdate = () => {
      if (activeTab === 'wishlist' && currentUser) {
        loadWishlist();
      }
    };
    
    // Listen to custom events for wishlist updates
    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
    };
  }, [activeTab, currentUser]);

  const loadWishlist = async () => {
    if (!currentUser) return;
    
    try {
      setLoadingWishlist(true);
      // Get wishlist items
      const items = await firebaseService.wishlist.getWishlist(currentUser.uid);
      setWishlistItems(items);

      // Fetch full product details
      if (items.length > 0) {
        const productIds = items.map(item => item.productId);
        const fetchedProducts = [];
        
        for (const productId of productIds) {
          try {
            const productDoc = await getDoc(doc(db, 'products', productId));
            if (productDoc.exists()) {
              fetchedProducts.push({ id: productDoc.id, ...productDoc.data() });
            }
          } catch (err) {
            console.error(`Error fetching product ${productId}:`, err);
          }
        }

        // Merge with wishlist data
        const mergedProducts = items.map(item => {
          const product = fetchedProducts.find(p => p.id === item.productId);
          return product ? { ...product, ...item } : null;
        }).filter(Boolean);

        setWishlistProducts(mergedProducts);
      } else {
        setWishlistProducts([]);
      }
    } catch (err) {
      console.error('Error loading wishlist:', err);
    } finally {
      setLoadingWishlist(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'escrow_funded': return 'bg-emerald-100 text-emerald-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending_wallet_funding': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'escrow_funded': return '🔒 Escrow Funded';
      case 'shipped': return '🚚 Shipped';
      case 'delivered': return '📦 Delivered';
      case 'completed': return '✅ Completed';
      case 'pending_wallet_funding': return '⏳ Awaiting Wallet Funding';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filters.status && order.status !== filters.status) return false;
      if (filters.vendor && !(order.vendorName || '').toLowerCase().includes(filters.vendor.toLowerCase())) return false;
      if (filters.from) {
        const fromDate = new Date(filters.from);
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : null;
        if (orderDate && orderDate < fromDate) return false;
      }
      if (filters.to) {
        const toDate = new Date(filters.to);
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : null;
        if (orderDate && orderDate > toDate) return false;
      }
      return true;
    });
  }, [orders, filters]);

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };

  const handleFundFromOrder = (order) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(false);
    setIsWalletTopUpOpen(true);
  };

  const openOrderConfirmation = (order) => {
    setOrderToConfirm(order);
    setIsOrderConfirmationOpen(true);
  };

  const handleConfirmTopUp = async ({ amount, note, order }) => {
    try {
      // Integrate with WalletManager/firebaseService if available
      await firebaseService.wallet.topUpEscrowWallet(order.walletId, amount, { note, orderId: order.id });
      // refresh transactions/orders lightweight
      const txns = await firebaseService.wallet.getUserTransactions(currentUser.uid);
      setTransactions(txns);
      setIsWalletTopUpOpen(false);
      alert('Wallet top-up request submitted.');
    } catch (e) {
      console.error('Top-up failed', e);
      alert('Failed to top up wallet.');
    }
  };

  const handleOrderConfirmation = async () => {
    // Refresh orders to show updated status
    const ordersData = await firebaseService.orders.getByUser(currentUser.uid, 'buyer');
    setOrders(ordersData);
    
    setIsOrderConfirmationOpen(false);
    setOrderToConfirm(null);
  };

  const openReviewVendor = (vendor) => {
    setReviewVendor(vendor);
    setIsReviewOpen(true);
  };

  const handleSubmitReview = async ({ rating, comment, vendor }) => {
    try {
      await firebaseService.reviews.submitVendorReview({
        vendorId: vendor.id,
        rating,
        comment,
        userId: currentUser.uid,
      });
      setIsReviewOpen(false);
      alert('Thank you for your review!');
    } catch (e) {
      console.error('Submit review failed', e);
      alert('Failed to submit review.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-6">
            <Link to="/" className="flex items-center mb-8">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Ojawa</span>
            </Link>
            
            {/* Dashboard Switcher */}
            <div className="mb-8">
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">BUYER MENU</p>
              <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'overview' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📊 Overview
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'orders' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📦 Orders
              </button>
              <button 
                onClick={() => setActiveTab('transactions')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'transactions' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💳 Transaction History
              </button>
              <button 
                onClick={() => setActiveTab('vendors')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'vendors' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                🏪 Vendors & Ratings
              </button>
              <button 
                onClick={() => setActiveTab('wishlist')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'wishlist' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💝 Wishlist
              </button>
              <button 
                onClick={() => setActiveTab('wallet')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'wallet' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💳 My Wallet
              </button>
              <button 
                onClick={() => setActiveTab('support')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'support' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                🆘 Help & Support
              </button>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <Link 
              to="/" 
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeOrders || 0}</p>
                </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">📦</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">₦{(stats.totalSpent || 0).toLocaleString()}</p>
                </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-xl">💰</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Trusted Vendors</p>
                      <p className="text-2xl font-bold text-gray-900">4</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-xl">🏪</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Rating Given</p>
                      <p className="text-2xl font-bold text-gray-900">4.7</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 text-xl">⭐</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600">✅</span>
                      </div>
                      <div>
                        <p className="font-medium">Order delivered - Shea Butter (500g)</p>
                        <p className="text-sm text-gray-600">From Tamale Naturals • Sep 7, 2025</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600">🚚</span>
                      </div>
                      <div>
                        <p className="font-medium">Order shipped - Ethiopian Coffee Beans</p>
                        <p className="text-sm text-gray-600">From Addis Coffee • Sep 5, 2025</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600">🔒</span>
                      </div>
                      <div>
                        <p className="font-medium">Wallet funded - Bespoke Suit</p>
                        <p className="text-sm text-gray-600">To Lagos Tailors • Sep 3, 2025</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-xl border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">All Orders</h2>
                  <OrdersFilterBar onChange={setFilters} />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.items && order.items.length > 0 ? order.items[0].name : 'Unknown Item'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.vendorName || 'Unknown Vendor'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(order.totalAmount || 0, order.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.walletId || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex flex-col gap-2">
                            <button onClick={() => openOrderDetails(order)} className="text-emerald-600 hover:text-emerald-700 font-medium text-left">View Details</button>
                            {order.status === 'escrow_funded' && (
                              <button 
                                onClick={() => openOrderConfirmation(order)} 
                                className="bg-emerald-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-emerald-700"
                              >
                                ✓ Confirm Order
                              </button>
                            )}
                            {order.status === 'pending_wallet_funding' && (
                              <button 
                                onClick={() => setActiveTab('wallet')} 
                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700"
                                title="Fund your wallet to complete this order"
                              >
                                💳 Fund Wallet
                              </button>
                            )}
                            {(order.status === 'shipped' || order.status === 'delivered') && (
                              <button 
                                onClick={() => openOrderConfirmation(order)} 
                                className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700"
                              >
                                ✓ Confirm Order
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="bg-white rounded-xl border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
                  <div className="flex gap-3">
                    <button className="text-sm text-gray-600 hover:text-gray-900">Export</button>
                    <select className="text-sm border rounded-lg px-3 py-1">
                      <option>Last 30 days</option>
                      <option>Last 3 months</option>
                      <option>Last year</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{txn.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{txn.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{txn.order}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{txn.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{txn.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'vendors' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Your Vendors</h2>
                  <p className="text-sm text-gray-600 mt-1">Vendors you've purchased from and their ratings</p>
                </div>
                
                <div className="p-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    {vendors.map((vendor, idx) => (
                      <div key={idx} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                              <span className="text-emerald-600 font-semibold">{vendor.name.charAt(0)}</span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                {vendor.name}
                                {vendor.verified && <span className="text-emerald-600">✓</span>}
                              </h3>
                              <p className="text-sm text-gray-600">{vendor.orders} orders • {vendor.totalSpent} spent</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className={`text-sm ${star <= Math.floor(vendor.rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                                  ⭐
                                </span>
                              ))}
                            </div>
                            <span className="text-sm font-medium">{vendor.rating}</span>
                          </div>
                          <button onClick={() => openReviewVendor(vendor)} className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Rate Vendor</button>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-2">Last order: {vendor.lastOrder}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">My Wishlist</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {wishlistProducts.length === 0 
                      ? 'Your wishlist is empty' 
                      : `${wishlistProducts.length} item${wishlistProducts.length !== 1 ? 's' : ''} saved`}
                  </p>
                </div>
                
                <div className="p-6">
                  {loadingWishlist ? (
                    <ProductListSkeleton count={4} />
                  ) : wishlistProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">💝</div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Your Wishlist is Empty</h3>
                      <p className="text-gray-600 mb-6">
                        Start saving your favorite products for later!
                      </p>
                      <Link
                        to="/products"
                        className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        Browse Products
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {wishlistProducts.map((product) => (
                        <div key={product.id} className="relative">
                          <div className="absolute top-2 right-2 z-10">
                            <WishlistButton 
                              product={product} 
                              size="md"
                              showText={false}
                            />
                          </div>
                          <ProductCard product={product} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Help & Support</h2>
                  <p className="text-sm text-gray-600 mt-1">Get help with your orders and account</p>
                </div>
                
                <div className="p-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="border rounded-lg p-6">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-blue-600 text-xl">💬</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
                      <p className="text-sm text-gray-600 mb-4">Chat with our support team in real-time</p>
                      <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                        Start Chat
                      </button>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-green-600 text-xl">📧</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
                      <p className="text-sm text-gray-600 mb-4">Send us an email and we'll respond within 24 hours</p>
                      <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                        Send Email
                      </button>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-yellow-600 text-xl">⚖️</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Dispute Resolution</h3>
                      <p className="text-sm text-gray-600 mb-4">File a dispute for order issues</p>
                      <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                        File Dispute
                      </button>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                        <span className="text-purple-600 text-xl">📚</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Help Center</h3>
                      <p className="text-sm text-gray-600 mb-4">Browse our FAQ and guides</p>
                      <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                        Browse FAQ
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-8 bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Track an order</span>
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Track →</button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Request refund</span>
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Request →</button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Report vendor</span>
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Report →</button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Update payment method</span>
                        <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">Update →</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <WalletManager userType="buyer" />
          )}

          <OrderDetailsModal
            open={isOrderDetailsOpen}
            order={selectedOrder}
            onClose={() => setIsOrderDetailsOpen(false)}
            onFundWallet={handleFundFromOrder}
          />

          <WalletTopUpModal
            open={isWalletTopUpOpen}
            order={selectedOrder}
            onClose={() => setIsWalletTopUpOpen(false)}
            onConfirm={handleConfirmTopUp}
          />

          <VendorReviewModal
            open={isReviewOpen}
            vendor={reviewVendor}
            onClose={() => setIsReviewOpen(false)}
            onSubmit={handleSubmitReview}
          />

          <OrderConfirmationModal
            open={isOrderConfirmationOpen}
            order={orderToConfirm}
            onClose={() => setIsOrderConfirmationOpen(false)}
            onConfirm={handleOrderConfirmation}
          />
        </div>
      </div>
    </div>
  );
};

export default Buyer;


