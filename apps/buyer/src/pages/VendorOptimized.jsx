import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

// Lazy load heavy components
const VendorStoreManager = lazy(() => import('../components/VendorStoreManager'));
const VendorOrdersFilterBar = lazy(() => import('../components/VendorOrdersFilterBar'));
const VendorOrderDetailsModal = lazy(() => import('../components/VendorOrderDetailsModal'));
const ShipOrderModal = lazy(() => import('../components/ShipOrderModal'));
const PayoutRequestModal = lazy(() => import('../components/PayoutRequestModal'));
const ProductEditorModal = lazy(() => import('../components/ProductEditorModal'));
const VendorProfileModal = lazy(() => import('../components/VendorProfileModal'));
const DisputeManagement = lazy(() => import('../components/DisputeManagement'));
const NotificationPreferences = lazy(() => import('../components/NotificationPreferences'));
const DashboardSwitcher = lazy(() => import('../components/DashboardSwitcher'));
const WalletManager = lazy(() => import('../components/WalletManager'));

// Skeleton components for better UX
const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
  </div>
);

const SkeletonTable = () => (
  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
    <div className="p-4 border-b">
      <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
    </div>
    <div className="divide-y">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 flex items-center space-x-4">
          <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse"></div>
        </div>
      ))}
    </div>
  </div>
);

const VendorOptimized = () => {
  console.log('🏪 VendorOptimized component loaded');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const { currentUser, userProfile } = useAuth();

  // Core state - only essential data
  const [stats, setStats] = useState({});
  const [ordersCount, setOrdersCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);

  // Tab-specific state - only load when needed
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [disputes, setDisputes] = useState([]);

  // Modal states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Load only essential data on mount
  const loadInitialData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Load only counts and basic stats - much faster
      const [ordersTotal, productsTotal, statsData] = await Promise.all([
        firebaseService.orders.countByUser(currentUser.uid, 'vendor'),
        firebaseService.products.countByVendor(currentUser.uid),
        firebaseService.analytics.getVendorStats(currentUser.uid)
      ]);
      
      setOrdersCount(ordersTotal);
      setProductsCount(productsTotal);
      setStats(statsData);
      
    } catch (error) {
      console.error('Error loading initial vendor data:', error);
      setStats({ totalSales: 0, activeOrders: 0 });
    } finally {
      setLoading(false);
      setInitialDataLoaded(true);
    }
  }, [currentUser]);

  // Load tab-specific data only when tab is active
  const loadTabData = useCallback(async (tab) => {
    if (!currentUser || !initialDataLoaded) return;

    try {
      switch (tab) {
        case 'orders':
          if (orders.length === 0) {
            const ordersPage = await firebaseService.orders.getByUserPaged({ 
              userId: currentUser.uid, 
              userType: 'vendor', 
              pageSize: 10 
            });
            setOrders(ordersPage.items);
          }
          break;
          
        case 'products':
          if (products.length === 0) {
            const productsPage = await firebaseService.products.getByVendorPaged({ 
              vendorId: currentUser.uid, 
              pageSize: 10 
            });
            setProducts(productsPage.items);
          }
          break;
          
        case 'payouts':
          if (payouts.length === 0) {
            const payoutsPage = await firebaseService.payouts.getByVendorPaged({ 
              vendorId: currentUser.uid, 
              pageSize: 10 
            });
            setPayouts(payoutsPage.items);
          }
          break;
          
        case 'disputes':
          if (disputes.length === 0) {
            const disputesPage = await firebaseService.disputes.getByVendorPaged({ 
              vendorId: currentUser.uid, 
              pageSize: 10 
            });
            setDisputes(disputesPage.items);
          }
          break;
      }
    } catch (error) {
      console.error(`Error loading ${tab} data:`, error);
    }
  }, [currentUser, initialDataLoaded, orders.length, products.length, payouts.length, disputes.length]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (initialDataLoaded) {
      loadTabData(activeTab);
    }
  }, [activeTab, loadTabData, initialDataLoaded]);

  // Overview tab content
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sales</p>
              <p className="text-2xl font-semibold text-gray-900">₦{stats.totalSales?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeOrders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Products</p>
              <p className="text-2xl font-semibold text-gray-900">{productsCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{ordersCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('products')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Add Product</p>
              <p className="text-sm text-gray-600">Create new listing</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">View Orders</p>
              <p className="text-sm text-gray-600">Manage orders</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('store')}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Store Settings</p>
              <p className="text-sm text-gray-600">Manage store</p>
            </div>
          </button>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="p-2 bg-orange-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Profile</p>
              <p className="text-sm text-gray-600">Update profile</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
            <span>You have {ordersCount} total orders</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
            <span>You have {productsCount} products listed</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
            <span>Store is active and visible to customers</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {userProfile?.displayName || currentUser?.displayName || 'Vendor'}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <Suspense fallback={<div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>}>
                <DashboardSwitcher />
              </Suspense>
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'products', label: 'Products' },
              { id: 'orders', label: 'Orders' },
              { id: 'store', label: 'Store' },
              { id: 'payouts', label: 'Payouts' },
              { id: 'disputes', label: 'Disputes' },
              { id: 'wallet', label: 'Wallet' },
              { id: 'settings', label: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border">
          {activeTab === 'overview' && renderOverview()}
          
          {activeTab === 'products' && (
            <Suspense fallback={<SkeletonTable />}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Products</h2>
                  <button
                    onClick={() => setEditorOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Product
                  </button>
                </div>
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📦</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Yet</h3>
                    <p className="text-gray-600 mb-4">Start by adding your first product to your store.</p>
                    <button
                      onClick={() => setEditorOpen(true)}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Your First Product
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="aspect-w-16 aspect-h-9 mb-4">
                          {product.images && product.images.length > 0 ? (
                            <img 
                              src={product.images[0]} 
                              alt={product.name}
                              className="w-full h-48 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-4xl">📦</span>
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-green-600">
                            ₦{product.price?.toLocaleString() || '0'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.status === 'active' ? 'bg-green-100 text-green-800' :
                            product.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {product.status || 'draft'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Suspense>
          )}

          {activeTab === 'store' && (
            <Suspense fallback={<SkeletonCard />}>
              <VendorStoreManager />
            </Suspense>
          )}

          {activeTab === 'wallet' && (
            <Suspense fallback={<SkeletonCard />}>
              <WalletManager />
            </Suspense>
          )}

          {activeTab === 'settings' && (
            <Suspense fallback={<SkeletonCard />}>
              <NotificationPreferences />
            </Suspense>
          )}
        </div>

        {/* Modals */}
        <Suspense fallback={null}>
          {isProfileModalOpen && (
            <VendorProfileModal
              isOpen={isProfileModalOpen}
              onClose={() => setIsProfileModalOpen(false)}
            />
          )}
          
          {editorOpen && (
            <ProductEditorModal
              isOpen={editorOpen}
              onClose={() => {
                setEditorOpen(false);
                setEditingProduct(null);
              }}
              product={editingProduct}
              onSave={() => {
                setEditorOpen(false);
                setEditingProduct(null);
                // Refresh products
                loadTabData('products');
              }}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default VendorOptimized;
