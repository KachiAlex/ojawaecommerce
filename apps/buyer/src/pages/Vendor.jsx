import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import WalletManager from '../components/WalletManager';
import DashboardSwitcher from '../components/DashboardSwitcher';
import VendorOrdersFilterBar from '../components/VendorOrdersFilterBar';
import VendorOrderDetailsModal from '../components/VendorOrderDetailsModal';
import ShipOrderModal from '../components/ShipOrderModal';
import PayoutRequestModal from '../components/PayoutRequestModal';
import ProductEditorModal from '../components/ProductEditorModal';

const Vendor = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [ordersCursor, setOrdersCursor] = useState(null);
  const [productsCursor, setProductsCursor] = useState(null);
  const [ordersCount, setOrdersCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [ordersPages, setOrdersPages] = useState([]);
  const [productsPages, setProductsPages] = useState([]);
  const [ordersPageIndex, setOrdersPageIndex] = useState(0);
  const [productsPageIndex, setProductsPageIndex] = useState(0);
  const pageSize = 10;
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const [filters, setFilters] = useState({ status: '', buyer: '', from: '', to: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isShipOpen, setIsShipOpen] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [payoutsCursor, setPayoutsCursor] = useState(null);
  const [disputesCursor, setDisputesCursor] = useState(null);
  const [payoutsPages, setPayoutsPages] = useState([]);
  const [disputesPages, setDisputesPages] = useState([]);
  const [payoutsPageIndex, setPayoutsPageIndex] = useState(0);
  const [disputesPageIndex, setDisputesPageIndex] = useState(0);
  const [payoutsCount, setPayoutsCount] = useState(0);
  const [disputesCount, setDisputesCount] = useState(0);
  const [loadingPayoutsNext, setLoadingPayoutsNext] = useState(false);
  const [loadingDisputesNext, setLoadingDisputesNext] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, product: null });
  const [uploadProgress, setUploadProgress] = useState(null);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);

  useEffect(() => {
    const fetchVendorData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch vendor orders (paged)
        const [ordersPage, ordersTotal] = await Promise.all([
          firebaseService.orders.getByUserPaged({ userId: currentUser.uid, userType: 'vendor', pageSize }),
          firebaseService.orders.countByUser(currentUser.uid, 'vendor')
        ]);
        setOrders(ordersPage.items);
        setOrdersCursor(ordersPage.nextCursor);
        setOrdersPages([{ items: ordersPage.items, cursor: ordersPage.nextCursor }]);
        setOrdersPageIndex(0);
        setOrdersCount(ordersTotal);
        
        // Fetch vendor products (paged)
        const [productsPage, productsTotal] = await Promise.all([
          firebaseService.products.getByVendorPaged({ vendorId: currentUser.uid, pageSize }),
          firebaseService.products.countByVendor(currentUser.uid)
        ]);
        setProducts(productsPage.items);
        setProductsCursor(productsPage.nextCursor);
        setProductsPages([{ items: productsPage.items, cursor: productsPage.nextCursor }]);
        setProductsPageIndex(0);
        setProductsCount(productsTotal);
        
        // Fetch vendor analytics
        const statsData = await firebaseService.analytics.getVendorStats(currentUser.uid);
        setStats(statsData);
        
        // Optional: payouts and disputes
        // Payouts and disputes paged
        const [payoutsPage, payoutsTotal] = await Promise.all([
          firebaseService.payouts.getByVendorPaged({ vendorId: currentUser.uid, pageSize }),
          firebaseService.payouts.countByVendor(currentUser.uid)
        ]);
        setPayouts(payoutsPage.items);
        setPayoutsCursor(payoutsPage.nextCursor);
        setPayoutsPages([{ items: payoutsPage.items, cursor: payoutsPage.nextCursor }]);
        setPayoutsPageIndex(0);
        setPayoutsCount(payoutsTotal);

        const [disputesPage, disputesTotal] = await Promise.all([
          firebaseService.disputes.getByVendorPaged({ vendorId: currentUser.uid, pageSize }),
          firebaseService.disputes.countByVendor(currentUser.uid)
        ]);
        setDisputes(disputesPage.items);
        setDisputesCursor(disputesPage.nextCursor);
        setDisputesPages([{ items: disputesPage.items, cursor: disputesPage.nextCursor }]);
        setDisputesPageIndex(0);
        setDisputesCount(disputesTotal);
        
      } catch (error) {
        console.error('Error fetching vendor data:', error);
        // Fallback to mock data
        setOrders([]);
        setProducts([]);
        setStats({ totalSales: 0, activeOrders: 0 });
        setPayouts([]);
        setDisputes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [currentUser]);

  // Real-time order status updates
  useEffect(() => {
    if (!currentUser) return;

    let unsubscribeOrders;

    const setupRealtimeListeners = async () => {
      try {
        const { onSnapshot, collection, query, where, orderBy } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');

        const ordersQuery = query(
          collection(db, 'orders'),
          where('vendorId', '==', currentUser.uid),
          orderBy('updatedAt', 'desc')
        );

        unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
          const updatedOrders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Update orders if they're different from current state
          setOrders(prevOrders => {
            const hasChanges = JSON.stringify(prevOrders) !== JSON.stringify(updatedOrders);
            return hasChanges ? updatedOrders : prevOrders;
          });
        });
      } catch (error) {
        console.error('Error setting up real-time listeners:', error);
      }
    };

    setupRealtimeListeners();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
      }
    };
  }, [currentUser]);

  const handleAddProduct = async (productData) => {
    try {
      await firebaseService.products.create(productData, currentUser.uid);
      setShowAddProductForm(false);
      // Refresh products
      const productsPage = await firebaseService.products.getByVendorPaged({ vendorId: currentUser.uid, pageSize });
      setProducts(productsPage.items);
      setProductsCursor(productsPage.nextCursor);
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filters.status && (order.statusKey || order.status) !== filters.status) return false;
      if (filters.buyer) {
        const buyerName = (order.buyer || order.buyerName || '').toLowerCase();
        if (!buyerName.includes(filters.buyer.toLowerCase())) return false;
      }
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : (order.date ? new Date(order.date) : null);
      if (filters.from && orderDate && orderDate < new Date(filters.from)) return false;
      if (filters.to && orderDate && orderDate > new Date(filters.to)) return false;
      return true;
    });
  }, [orders, filters]);

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };

  const openShipModal = (order) => {
    setSelectedOrder(order);
    setIsShipOpen(true);
  };

  const confirmShipment = async ({ carrier, trackingNumber, eta, order }) => {
    try {
      await firebaseService.orders.markShipped(order.id, { carrier, trackingNumber, eta });
      
      // Send order status update email
      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { functions } = await import('../firebase/config');
        const sendOrderStatusUpdate = httpsCallable(functions, 'sendOrderStatusUpdate');
        
        await sendOrderStatusUpdate({
          buyerEmail: order.buyerEmail || order.buyer,
          buyerName: order.buyerName || order.buyer,
          orderId: order.id,
          status: 'shipped',
          trackingNumber: trackingNumber,
          carrier: carrier
        });
      } catch (emailError) {
        console.warn('Failed to send shipping notification:', emailError);
      }
      
      const refreshed = await firebaseService.orders.getByUserPaged({ userId: currentUser.uid, userType: 'vendor', pageSize });
      setOrders(refreshed.items);
      setOrdersCursor(refreshed.nextCursor);
      setIsShipOpen(false);
      alert('Order marked as shipped.');
    } catch (e) {
      console.error('Mark shipped failed', e);
      alert('Failed to mark as shipped.');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      // Get order details
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Release wallet funds to vendor
      await firebaseService.wallet.releaseWallet(orderId, order.vendorId, order.totalAmount);
      
      // Update order status to completed
      await firebaseService.orders.updateStatus(orderId, 'completed', {
        completedAt: new Date(),
        completedBy: 'vendor'
      });

      // Auto-create payout request for completed order (optional - vendor can manage manually)
      try {
        await firebaseService.payouts.request({
          vendorId: currentUser.uid,
          method: 'bank_transfer', // Default method
          amount: order.totalAmount,
          account: {
            type: 'bank',
            accountNumber: 'AUTO-GENERATED', // Should come from vendor profile
            accountName: currentUser.displayName || 'Vendor',
            bankName: 'Default Bank'
          }
        });
      } catch (payoutError) {
        console.warn('Auto-payout creation failed:', payoutError);
        // Don't fail the order completion if payout creation fails
      }

      // Refresh orders and payouts
      const [refreshedOrders, refreshedPayouts] = await Promise.all([
        firebaseService.orders.getByUserPaged({ userId: currentUser.uid, userType: 'vendor', pageSize }),
        firebaseService.payouts.getByVendorPaged({ vendorId: currentUser.uid, pageSize })
      ]);
      setOrders(refreshedOrders.items);
      setOrdersCursor(refreshedOrders.nextCursor);
      setPayouts(refreshedPayouts.items);
      setPayoutsCursor(refreshedPayouts.nextCursor);
      
      // Show success message
      alert('Order completed successfully! Funds have been released to your wallet and payout request created.');
    } catch (error) {
      console.error('Error completing order:', error);
      alert('Failed to complete order. Please try again.');
    }
  };

  const submitPayout = async ({ method, amount, account }) => {
    try {
      await firebaseService.payouts.request({ vendorId: currentUser.uid, method, amount, account });
      const payoutsData = await firebaseService.payouts?.getByVendor?.(currentUser.uid);
      if (payoutsData) setPayouts(payoutsData);
      setIsPayoutOpen(false);
      alert('Payout request submitted.');
    } catch (e) {
      console.error('Payout request failed', e);
      alert('Failed to submit payout request.');
    }
  };

  const handleCreateDispute = async (orderId, disputeData) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      await firebaseService.disputes.createWithWalletHold(
        {
          ...disputeData,
          vendorId: currentUser.uid,
          buyerId: order.buyerId
        },
        orderId,
        order.totalAmount
      );

      // Refresh disputes and orders
      const [refreshedDisputes, refreshedOrders] = await Promise.all([
        firebaseService.disputes.getByVendorPaged({ vendorId: currentUser.uid, pageSize }),
        firebaseService.orders.getByUserPaged({ userId: currentUser.uid, userType: 'vendor', pageSize })
      ]);
      setDisputes(refreshedDisputes.items);
      setDisputesCursor(refreshedDisputes.nextCursor);
      setOrders(refreshedOrders.items);
      setOrdersCursor(refreshedOrders.nextCursor);

      alert('Dispute created successfully! Funds have been held pending resolution.');
    } catch (error) {
      console.error('Error creating dispute:', error);
      alert('Failed to create dispute. Please try again.');
    }
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setEditorOpen(true);
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setEditorOpen(true);
  };

  const saveProduct = async (payload) => {
    try {
      setUploadProgress(0);
      if (editingProduct) {
        await firebaseService.products.saveWithUploadsWithProgress(payload, currentUser.uid, editingProduct.id, { onProgress: (p) => setUploadProgress(p) });
      } else {
        await firebaseService.products.saveWithUploadsWithProgress(payload, currentUser.uid, null, { onProgress: (p) => setUploadProgress(p) });
      }
      const productsPage = await firebaseService.products.getByVendorPaged({ vendorId: currentUser.uid, pageSize });
      setProducts(productsPage.items);
      setProductsCursor(productsPage.nextCursor);
      setEditorOpen(false);
      setEditingProduct(null);
      setUploadProgress(null);
    } catch (e) {
      console.error('Save product failed', e);
      alert('Failed to save product.');
      setUploadProgress(null);
    }
  };

  const deleteProduct = async (productId) => {
    if (!productId) return;
    try {
      setDeletingProductId(productId);
      await firebaseService.products.delete(productId);
      const page = await firebaseService.products.getByVendorPaged({ vendorId: currentUser.uid, pageSize });
      setProducts(page.items);
      setProductsCursor(page.nextCursor);
      setProductsPages([{ items: page.items, cursor: page.nextCursor }]);
      setProductsPageIndex(0);
      setConfirmDelete({ open: false, product: null });
    } catch (e) {
      console.error('Delete product failed', e);
      alert('Failed to delete product.');
    }
    setDeletingProductId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your vendor dashboard...</p>
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
              <DashboardSwitcher currentDashboard="vendor" />
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">VENDOR MENU</p>
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
                onClick={() => setActiveTab('products')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'products' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                🛍️ Products
              </button>
              <button 
                onClick={() => setActiveTab('payouts')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'payouts' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💰 Payouts
              </button>
              <button 
                onClick={() => setActiveTab('disputes')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'disputes' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                ⚖️ Disputes
              </button>
              <button 
                onClick={() => setActiveTab('wallet')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'wallet' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💳 My Wallet
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'analytics' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📈 Analytics
              </button>
            </div>
          </div>
          
          <div className="absolute bottom-4 left-4">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Back to Home</Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Add Product Modal */}
          {showAddProductForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Add New Product</h2>
                    <button 
                      onClick={() => setShowAddProductForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                
                <form className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                      <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Enter product name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option>Fashion</option>
                        <option>Beauty</option>
                        <option>Electronics</option>
                        <option>Home & Living</option>
                        <option>Food</option>
                        <option>Crafts</option>
                        <option>Services</option>
                        <option>Agriculture</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea rows="4" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Describe your product..."></textarea>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        <option>₦ NGN</option>
                        <option>₵ GHS</option>
                        <option>KSh KES</option>
                        <option>Br ETB</option>
                        <option>$ USD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="0" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <div className="text-gray-400 mb-2">📷</div>
                      <p className="text-sm text-gray-600">Drop images here or click to upload</p>
                      <input type="file" multiple accept="image/*" className="hidden" />
                      <button type="button" className="mt-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium">Choose Files</button>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                      Add Product
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowAddProductForm(false)}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Sales</p>
                      <p className="text-2xl font-bold text-gray-900">₦{(stats.totalSales || 0).toLocaleString()}</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <span className="mr-1">▲</span> 12.4%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-xl">💰</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeOrders || 0}</p>
                      <p className="text-xs text-green-600 flex items-center mt-1">
                        <span className="mr-1">▲</span> 2.0%
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">📦</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalOrders || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 text-xl">🔒</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.completedOrders || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-xl">🛍️</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600">💰</span>
                          </div>
                          <div>
                            <p className="font-medium">Payment received - Kente Scarf</p>
                            <p className="text-sm text-gray-600">From John D. • ₵150 • Sep 10, 2025</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600">📦</span>
                          </div>
                          <div>
                            <p className="font-medium">Order shipped - Leather Sandals</p>
                            <p className="text-sm text-gray-600">To Peter M. • KSh 6,800 • Sep 4, 2025</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                            <span className="text-yellow-600">🔒</span>
                          </div>
                          <div>
                            <p className="font-medium">Wallet funded - Ankara Dress</p>
                            <p className="text-sm text-gray-600">From Amina K. • ₦85,000 • Sep 1, 2025</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-xl border">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6 space-y-3">
                      <button 
                        onClick={() => setShowAddProductForm(true)}
                        className="w-full bg-emerald-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                      >
                        Add Product
                      </button>
                      <button 
                        onClick={() => setActiveTab('orders')}
                        className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Manage Orders
                      </button>
                      <button 
                        onClick={() => setActiveTab('payouts')}
                        className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        View Payouts
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border">
                    <div className="p-6 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Conversion Rate</span>
                          <span className="text-sm font-medium">3.2%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Avg Order Value</span>
                          <span className="text-sm font-medium">₦28,500</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Customer Rating</span>
                          <span className="text-sm font-medium">4.8 ⭐</span>
                        </div>
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
                  <h2 className="text-lg font-semibold text-gray-900">Order Management</h2>
                  <VendorOrdersFilterBar onChange={setFilters} />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.item}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <p>{order.buyer}</p>
                            <p className="text-xs text-gray-400">{order.buyerPhone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.statusColor}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.walletId || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button onClick={() => openOrderDetails(order)} className="text-emerald-600 hover:text-emerald-700 font-medium">View</button>
                            {order.status === 'pending_wallet_funding' && (
                            <button onClick={() => openShipModal(order)} className="text-blue-600 hover:text-blue-700 font-medium">Ship</button>
                            )}
                            {order.status === 'shipped' && (
                              <button 
                                onClick={() => handleCompleteOrder(order.id)} 
                                className="text-green-600 hover:text-green-700 font-medium"
                              >
                                Complete
                              </button>
                            )}
                            {order.status === 'completed' && (
                              <button 
                                onClick={() => handleCreateDispute(order.id, {
                                  reason: 'Product not as described',
                                  description: 'Customer complaint about product quality'
                                })} 
                                className="text-red-600 hover:text-red-700 font-medium"
                              >
                                Dispute
                              </button>
                            )}
                            <button className="text-gray-600 hover:text-gray-700 font-medium">Contact</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">{orders.length} of {ordersCount} orders</div>
                <div className="flex gap-2">
                  <button
                    disabled={ordersPageIndex === 0}
                    onClick={() => {
                      if (ordersPageIndex === 0) return;
                      const prevIndex = ordersPageIndex - 1;
                      setOrders(ordersPages[prevIndex].items);
                      setOrdersCursor(ordersPages[prevIndex].cursor);
                      setOrdersPageIndex(prevIndex);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg border ${ordersPageIndex > 0 ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                  >
                    Previous
                  </button>
                  <button
                    disabled={!ordersCursor}
                    onClick={async () => {
                      if (!ordersCursor) return;
                      try {
                        const next = await firebaseService.orders.getByUserPaged({ userId: currentUser.uid, userType: 'vendor', pageSize, cursor: ordersCursor });
                        setOrders(next.items);
                        setOrdersCursor(next.nextCursor);
                        setOrdersPages((prev) => [...prev, { items: next.items, cursor: next.nextCursor }]);
                        setOrdersPageIndex((i) => i + 1);
                      } catch (e) {
                        console.error('Next orders failed', e);
                      }
                    }}
                    className={`px-3 py-2 text-sm rounded-lg border ${ordersCursor ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Product Management</h2>
                <button 
                  onClick={openCreateProduct}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700"
                >
                  Add New Product
                </button>
              </div>

              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Your Products</h3>
                    <div className="flex gap-3">
                      <select className="text-sm border rounded-lg px-3 py-1">
                        <option>All Products</option>
                        <option>Active</option>
                        <option>Out of Stock</option>
                        <option>Draft</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex -space-x-2">
                                {Array.isArray(product.images) && product.images.length > 0 ? (
                                  product.images.slice(0,3).map((url, i) => (
                                    <img key={i} src={url} alt={`${product.name}-${i}`} className="w-10 h-10 rounded-lg border object-cover bg-gray-100" />
                                  ))
                                ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <span className="text-lg">🖼️</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.price}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sold}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                (product.status || '').toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : 
                                (product.status || '').toLowerCase() === 'out of stock' ? 'bg-red-100 text-red-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                                {product.status || 'Draft'}
                            </span>
                              <select
                                className="text-xs border rounded px-2 py-1"
                                value={product.status || 'draft'}
                                onChange={async (e) => {
                                  const next = e.target.value;
                                  try {
                                    setUpdatingProductId(product.id);
                                    await firebaseService.products.update(product.id, { status: next });
                                    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, status: next } : p));
                                  } catch (err) {
                                    console.error('Status update failed', err);
                                    alert('Failed to update status');
                                  }
                                  setUpdatingProductId(null);
                                }}
                              >
                                <option value="active">Active</option>
                                <option value="out of stock">Out of Stock</option>
                                <option value="draft">Draft</option>
                              </select>
                              {updatingProductId === product.id && (
                                <span className="text-xs text-gray-500">Saving...</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button onClick={() => openEditProduct(product)} className="text-emerald-600 hover:text-emerald-700 font-medium">Edit</button>
                              <button className="text-blue-600 hover:text-blue-700 font-medium">View</button>
                              <button onClick={() => setConfirmDelete({ open: true, product })} className="text-red-600 hover:text-red-700 font-medium" disabled={deletingProductId === product.id}>
                                {deletingProductId === product.id ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">{payouts.length} of {payoutsCount} payouts</div>
                  <div className="flex gap-2">
                    <button
                      disabled={payoutsPageIndex === 0}
                      onClick={() => {
                        if (payoutsPageIndex === 0) return;
                        const prevIndex = payoutsPageIndex - 1;
                        setPayouts(payoutsPages[prevIndex].items);
                        setPayoutsCursor(payoutsPages[prevIndex].cursor);
                        setPayoutsPageIndex(prevIndex);
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border ${payoutsPageIndex > 0 ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                    >
                      Previous
                    </button>
                    <button
                      disabled={!payoutsCursor || loadingPayoutsNext}
                      onClick={async () => {
                        if (!payoutsCursor || loadingPayoutsNext) return;
                        setLoadingPayoutsNext(true);
                        try {
                          const next = await firebaseService.payouts.getByVendorPaged({ vendorId: currentUser.uid, pageSize, cursor: payoutsCursor });
                          setPayouts(next.items);
                          setPayoutsCursor(next.nextCursor);
                          setPayoutsPages((prev) => [...prev, { items: next.items, cursor: next.nextCursor }]);
                          setPayoutsPageIndex((i) => i + 1);
                        } catch (e) {
                          console.error('Next payouts failed', e);
                        } finally {
                          setLoadingPayoutsNext(false);
                        }
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border flex items-center gap-2 ${payoutsCursor && !loadingPayoutsNext ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                    >
                      {loadingPayoutsNext ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        'Next'
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">{products.length} of {productsCount} products</div>
                <div className="flex gap-2">
                  <button
                    disabled={productsPageIndex === 0}
                    onClick={() => {
                      if (productsPageIndex === 0) return;
                      const prevIndex = productsPageIndex - 1;
                      setProducts(productsPages[prevIndex].items);
                      setProductsCursor(productsPages[prevIndex].cursor);
                      setProductsPageIndex(prevIndex);
                    }}
                    className={`px-3 py-2 text-sm rounded-lg border ${productsPageIndex > 0 ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                  >
                    Previous
                  </button>
                  <button
                    disabled={!productsCursor}
                    onClick={async () => {
                      if (!productsCursor) return;
                      try {
                        const next = await firebaseService.products.getByVendorPaged({ vendorId: currentUser.uid, pageSize, cursor: productsCursor });
                        setProducts(next.items);
                        setProductsCursor(next.nextCursor);
                        setProductsPages((prev) => [...prev, { items: next.items, cursor: next.nextCursor }]);
                        setProductsPageIndex((i) => i + 1);
                      } catch (e) {
                        console.error('Next products failed', e);
                      }
                    }}
                    className={`px-3 py-2 text-sm rounded-lg border ${productsCursor ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Payout History</h2>
                    <div className="flex gap-3">
                      <button className="text-sm text-gray-600 hover:text-gray-900">Export</button>
                      <button onClick={() => setIsPayoutOpen(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">Request Payout</button>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payout.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payout.amount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payout.orders} orders</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payout.method}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payout.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              payout.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                              payout.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {payout.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">{disputes.length} of {disputesCount} disputes</div>
                  <div className="flex gap-2">
                    <button
                      disabled={disputesPageIndex === 0}
                      onClick={() => {
                        if (disputesPageIndex === 0) return;
                        const prevIndex = disputesPageIndex - 1;
                        setDisputes(disputesPages[prevIndex].items);
                        setDisputesCursor(disputesPages[prevIndex].cursor);
                        setDisputesPageIndex(prevIndex);
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border ${disputesPageIndex > 0 ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                    >
                      Previous
                    </button>
                    <button
                      disabled={!disputesCursor || loadingDisputesNext}
                      onClick={async () => {
                        if (!disputesCursor || loadingDisputesNext) return;
                        setLoadingDisputesNext(true);
                        try {
                          const next = await firebaseService.disputes.getByVendorPaged({ vendorId: currentUser.uid, pageSize, cursor: disputesCursor });
                          setDisputes(next.items);
                          setDisputesCursor(next.nextCursor);
                          setDisputesPages((prev) => [...prev, { items: next.items, cursor: next.nextCursor }]);
                          setDisputesPageIndex((i) => i + 1);
                        } catch (e) {
                          console.error('Next disputes failed', e);
                        } finally {
                          setLoadingDisputesNext(false);
                        }
                      }}
                      className={`px-3 py-2 text-sm rounded-lg border flex items-center gap-2 ${disputesCursor && !loadingDisputesNext ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                    >
                      {loadingDisputesNext ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          Loading...
                        </>
                      ) : (
                        'Next'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Payout Settings</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payout Method</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>Bank Transfer</option>
                        <option>Mobile Money</option>
                        <option>PayPal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Payout</label>
                      <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="100.00" />
                    </div>
                  </div>
                  <button className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                    Update Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'disputes' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Dispute Management</h2>
                    <div className="flex gap-3">
                      <select className="text-sm border rounded-lg px-3 py-1">
                        <option>All Disputes</option>
                        <option>Open</option>
                        <option>Resolved</option>
                        <option>Escalated</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispute ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {disputes.map((dispute) => (
                        <tr key={dispute.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dispute.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dispute.order}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dispute.buyer}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dispute.issue}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              dispute.priority === 'High' ? 'bg-red-100 text-red-800' : 
                              dispute.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              {dispute.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              dispute.status === 'Open' ? 'bg-red-100 text-red-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              {dispute.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dispute.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button className="text-emerald-600 hover:text-emerald-700 font-medium">Respond</button>
                              <button className="text-blue-600 hover:text-blue-700 font-medium">View</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Overview</h3>
                  <svg viewBox="0 0 100 40" className="w-full h-40">
                    <defs>
                      <linearGradient id="gradSales" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const points = Array.from({ length: 8 }).map((_, i) => {
                        const x = (i / 7) * 100;
                        const yBase = (stats.totalSales || 0) % 100000;
                        const yVal = (yBase / 100000) * 25 + (i * 2);
                        const y = 35 - Math.min(35, Math.max(5, yVal));
                        return `${x},${y}`;
                      }).join(' ');
                      return (
                        <>
                          <polyline fill="none" stroke="#10b981" strokeWidth="1.5" points={points} />
                          <polyline fill="url(#gradSales)" stroke="none" points={`0,40 ${points} 100,40`} />
                        </>
                      );
                    })()}
                  </svg>
                </div>

                <div className="bg-white p-6 rounded-xl border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Volume</h3>
                  <svg viewBox="0 0 100 40" className="w-full h-40">
                    <defs>
                      <linearGradient id="gradOrders" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const points = Array.from({ length: 8 }).map((_, i) => {
                        const x = (i / 7) * 100;
                        const yBase = (stats.totalOrders || 0) % 100;
                        const yVal = (yBase / 100) * 25 + (i * 3);
                        const y = 35 - Math.min(35, Math.max(5, yVal));
                        return `${x},${y}`;
                      }).join(' ');
                      return (
                        <>
                          <polyline fill="none" stroke="#3b82f6" strokeWidth="1.5" points={points} />
                          <polyline fill="url(#gradOrders)" stroke="none" points={`0,40 ${points} 100,40`} />
                        </>
                      );
                    })()}
                  </svg>
                </div>

                <div className="bg-white p-6 rounded-xl border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">KPIs</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Orders</span>
                      <span className="text-sm font-medium">{stats.totalOrders || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Completed</span>
                      <span className="text-sm font-medium">{stats.completedOrders || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active</span>
                      <span className="text-sm font-medium">{stats.activeOrders || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <WalletManager userType="vendor" />
          )}

        <VendorOrderDetailsModal
          open={isOrderDetailsOpen}
          order={selectedOrder}
          onClose={() => setIsOrderDetailsOpen(false)}
          onShip={openShipModal}
        />

        <ShipOrderModal
          open={isShipOpen}
          order={selectedOrder}
          onClose={() => setIsShipOpen(false)}
          onConfirm={confirmShipment}
        />

        <PayoutRequestModal
          open={isPayoutOpen}
          onClose={() => setIsPayoutOpen(false)}
          onSubmit={submitPayout}
        />

        <ProductEditorModal
          open={editorOpen}
          product={editingProduct}
          onClose={() => { setEditorOpen(false); setEditingProduct(null); }}
          onSave={saveProduct}
          progress={uploadProgress}
        />

        {confirmDelete.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete({ open: false, product: null })} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Delete Product</h3>
                <button onClick={() => setConfirmDelete({ open: false, product: null })} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
              <div className="p-6 space-y-3">
                <p className="text-gray-700">Are you sure you want to delete <span className="font-medium">{confirmDelete.product?.name}</span>?</p>
                <p className="text-sm text-red-600">This action cannot be undone.</p>
              </div>
              <div className="p-6 border-t flex items-center justify-end gap-3">
                <button onClick={() => setConfirmDelete({ open: false, product: null })} className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={() => deleteProduct(confirmDelete.product?.id)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Vendor;


