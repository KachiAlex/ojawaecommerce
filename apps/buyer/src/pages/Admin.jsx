import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import firebaseService from '../services/firebaseService';

const Admin = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Platform stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalLogistics: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalRevenue: 0,
    pendingDisputes: 0,
    activeUsers: 0
  });

  // Users data
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userFilter, setUserFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  // Orders data
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('all');

  // Products data
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [productFilter, setProductFilter] = useState('all');

  // Disputes data
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || !userProfile || userProfile.role !== 'admin') {
      navigate('/');
      return;
    }

    loadAdminData();
  }, [currentUser, userProfile, navigate]);

  useEffect(() => {
    filterUsers();
  }, [users, userFilter, userSearch]);

  useEffect(() => {
    filterOrders();
  }, [orders, orderFilter]);

  useEffect(() => {
    filterProducts();
  }, [products, productFilter]);

  const loadAdminData = async () => {
    try {
      setLoading(true);

      // Load all users with pagination
      const usersResult = await firebaseService.admin.getAllUsers({ pageSize: 1000 });
      const usersData = usersResult.items || [];
      setUsers(usersData);

      // Load all orders with pagination
      const ordersResult = await firebaseService.admin.getAllOrders({ pageSize: 1000 });
      const ordersData = ordersResult.items || [];
      
      // Enrich orders with vendor information
      const enrichedOrders = await Promise.all(
        ordersData.map(async (order) => {
          if (order.vendorId) {
            try {
              const vendor = await firebaseService.userService.getProfile(order.vendorId);
              return {
                ...order,
                vendorName: vendor?.displayName || vendor?.email || 'Unknown Vendor',
                vendorEmail: vendor?.email || 'N/A',
                storeName: vendor?.vendorProfile?.storeName || vendor?.storeName || 'N/A'
              };
            } catch (error) {
              console.error(`Error fetching vendor info for order ${order.id}:`, error);
              return {
                ...order,
                vendorName: 'Error loading vendor',
                vendorEmail: 'N/A',
                storeName: 'N/A'
              };
            }
          }
          return {
            ...order,
            vendorName: 'N/A',
            vendorEmail: 'N/A',
            storeName: 'N/A'
          };
        })
      );
      
      setOrders(enrichedOrders);

      // Load all products (including pending, active, and rejected for admin review)
      const productsData = await firebaseService.products.getAll({ showAll: true });
      setProducts(productsData);

      // Load disputes with pagination
      const disputesResult = await firebaseService.admin.getAllDisputes({ pageSize: 1000 });
      const disputesData = disputesResult.items || [];
      setDisputes(disputesData);

      // Calculate stats
      const totalUsers = usersData.length;
      const totalVendors = usersData.filter(u => u.role === 'vendor').length;
      const totalLogistics = usersData.filter(u => u.role === 'logistics').length;
      const totalOrders = ordersData.length;
      const totalProducts = productsData.length;
      const totalRevenue = ordersData
        .filter(o => o.status === 'completed' || o.status === 'delivered' || o.status === 'confirmed')
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const pendingDisputes = disputesData.filter(d => d.status === 'pending' || d.status === 'investigating').length;
      const activeUsers = usersData.filter(u => {
        if (!u.lastActive) return false;
        const lastActive = u.lastActive.toDate ? u.lastActive.toDate() : new Date(u.lastActive);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastActive >= thirtyDaysAgo;
      }).length;

      setStats({
        totalUsers,
        totalVendors,
        totalLogistics,
        totalOrders,
        totalProducts,
        totalRevenue,
        pendingDisputes,
        activeUsers
      });
      
      console.log('✅ Admin data loaded successfully:', {
        users: usersData.length,
        orders: enrichedOrders.length,
        products: productsData.length,
        disputes: disputesData.length,
        ordersWithVendors: enrichedOrders.filter(o => o.vendorName !== 'N/A').length
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
      // Set empty arrays on error to prevent crashes
      setUsers([]);
      setOrders([]);
      setProducts([]);
      setDisputes([]);
      setStats({
        totalUsers: 0,
        totalVendors: 0,
        totalLogistics: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalRevenue: 0,
        pendingDisputes: 0,
        activeUsers: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (userFilter !== 'all') {
      filtered = filtered.filter(u => u.role === userFilter);
    }

    if (userSearch) {
      const search = userSearch.toLowerCase();
      filtered = filtered.filter(u => 
        u.email?.toLowerCase().includes(search) ||
        u.displayName?.toLowerCase().includes(search) ||
        u.phoneNumber?.includes(search)
      );
    }

    setFilteredUsers(filtered);
  };

  const filterOrders = () => {
    let filtered = orders;

    if (orderFilter !== 'all') {
      filtered = filtered.filter(o => o.status === orderFilter);
    }

    setFilteredOrders(filtered);
  };

  const filterProducts = () => {
    let filtered = products;

    if (productFilter === 'outOfStock') {
      filtered = filtered.filter(p => (p.stock || p.stockQuantity || 0) === 0);
    } else if (productFilter === 'lowStock') {
      filtered = filtered.filter(p => {
        const stock = p.stock || p.stockQuantity || 0;
        return stock > 0 && stock <= 5;
      });
    } else if (productFilter === 'inactive') {
      filtered = filtered.filter(p => p.status === 'inactive' || p.inStock === false);
    }

    setFilteredProducts(filtered);
  };

  const handleSuspendUser = async (userId) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;

    try {
      await firebaseService.users.update(userId, { 
        suspended: true,
        suspendedAt: new Date(),
        suspendedBy: currentUser.uid
      });
      alert('User suspended successfully');
      loadAdminData();
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Failed to suspend user');
    }
  };

  const handleUnsuspendUser = async (userId) => {
    try {
      await firebaseService.users.update(userId, { 
        suspended: false,
        unsuspendedAt: new Date(),
        unsuspendedBy: currentUser.uid
      });
      alert('User unsuspended successfully');
      loadAdminData();
    } catch (error) {
      console.error('Error unsuspending user:', error);
      alert('Failed to unsuspend user');
    }
  };

  const handleResolveDispute = async (disputeId, resolution) => {
    if (!resolutionNote.trim()) {
      alert('Please provide a resolution note');
      return;
    }

    try {
      await firebaseService.disputes?.update(disputeId, {
        status: 'resolved',
        resolution,
        resolutionNote,
        resolvedAt: new Date(),
        resolvedBy: currentUser.uid
      });
      alert('Dispute resolved successfully');
      setSelectedDispute(null);
      setResolutionNote('');
      loadAdminData();
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert('Failed to resolve dispute');
    }
  };

  const formatCurrency = (amount) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-sm text-gray-600 mt-1">Platform Management & Oversight</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back to Platform
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.activeUsers} active (30 days)</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.totalVendors} vendors</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{stats.totalProducts} products</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Disputes</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingDisputes}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.totalLogistics} logistics partners</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {['overview', 'users', 'orders', 'products', 'disputes'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-4">
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Users</option>
                      <option value="buyer">Buyers</option>
                      <option value="vendor">Vendors</option>
                      <option value="logistics">Logistics</option>
                      <option value="admin">Admins</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm w-64"
                    />
                  </div>
                  <p className="text-sm text-gray-600">{filteredUsers.length} users</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{user.displayName || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'vendor' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'logistics' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role || 'buyer'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              user.suspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {user.suspended ? 'Suspended' : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => user.suspended ? handleUnsuspendUser(user.id) : handleSuspendUser(user.id)}
                                className={`px-3 py-1 rounded-md text-xs font-medium ${
                                  user.suspended
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              >
                                {user.suspended ? 'Unsuspend' : 'Suspend'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <select
                    value={orderFilter}
                    onChange={(e) => setOrderFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <p className="text-sm text-gray-600">{filteredOrders.length} orders</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOrders.slice(0, 50).map(order => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            #{order.id.slice(0, 8)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            {formatCurrency(order.totalAmount || 0)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              order.status === 'completed' || order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {order.buyerEmail || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {order.vendorName && order.vendorName !== 'N/A' ? (
                              <div>
                                <div className="font-medium">{order.storeName !== 'N/A' ? order.storeName : order.vendorName}</div>
                                {order.storeName !== 'N/A' && order.storeName !== order.vendorName && (
                                  <div className="text-xs text-gray-500">{order.vendorName}</div>
                                )}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <select
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Products</option>
                    <option value="outOfStock">Out of Stock</option>
                    <option value="lowStock">Low Stock</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <p className="text-sm text-gray-600">{filteredProducts.length} products</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.slice(0, 30).map(product => {
                    const stock = product.stock || product.stockQuantity || 0;
                    return (
                      <div key={product.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                          {product.images && product.images[0] && (
                            <img 
                              src={product.images[0]} 
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded-md"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 text-sm">{product.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(product.price || 0)}
                              </p>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                stock === 0 ? 'bg-red-100 text-red-800' :
                                stock <= 5 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                Stock: {stock}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Disputes Tab */}
            {activeTab === 'disputes' && (
              <div>
                <div className="mb-6">
                  <p className="text-sm text-gray-600">{disputes.length} disputes</p>
                </div>

                {disputes.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500">No disputes to display</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {disputes.map(dispute => (
                      <div key={dispute.id} className="bg-gray-50 rounded-lg p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900">
                                Dispute #{dispute.id.slice(0, 8)}
                              </h4>
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                dispute.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                dispute.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {dispute.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{dispute.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Order: #{dispute.orderId?.slice(0, 8)}</span>
                              <span>Filed: {formatDate(dispute.createdAt)}</span>
                            </div>
                          </div>
                          {dispute.status !== 'resolved' && (
                            <button
                              onClick={() => setSelectedDispute(dispute)}
                              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {orders.slice(0, 5).map(order => (
                      <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Order #{order.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatCurrency(order.totalAmount || 0)}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dispute Resolution Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Resolve Dispute #{selectedDispute.id.slice(0, 8)}
            </h3>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Description:</p>
              <p className="text-gray-900">{selectedDispute.description}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Note
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Provide details about how this dispute was resolved..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleResolveDispute(selectedDispute.id, 'favor_buyer')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Resolve in Favor of Buyer
              </button>
              <button
                onClick={() => handleResolveDispute(selectedDispute.id, 'favor_vendor')}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                Resolve in Favor of Vendor
              </button>
              <button
                onClick={() => {
                  setSelectedDispute(null);
                  setResolutionNote('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

