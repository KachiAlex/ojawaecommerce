import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const AdminDashboard = () => {
  const { userProfile, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [logistics, setLogistics] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [pendingProducts, setPendingProducts] = useState([]);
  const [activeProducts, setActiveProducts] = useState([]);
  const [rejectedProducts, setRejectedProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // UI states
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Fetch all admin data using admin services
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Use admin services for better performance and pagination
      const [usersData, ordersData, disputesData, analyticsData, pendingVendorsData, logisticsData, pending, active, rejected] = await Promise.all([
        firebaseService.admin.getAllUsers({ pageSize: 100 }),
        firebaseService.admin.getAllOrders({ pageSize: 100 }),
        firebaseService.admin.getAllDisputes({ pageSize: 100 }),
        firebaseService.admin.getPlatformAnalytics(),
        firebaseService.admin.getPendingVendors(),
        firebaseService.logistics.getAllPartners(),
        firebaseService.products.getAll({ status: 'pending' }),
        firebaseService.products.getAll({ status: 'active' }),
        firebaseService.products.getAll({ status: 'rejected' })
      ]);
      
      setUsers(usersData.items);
      setOrders(ordersData.items);
      setDisputes(disputesData.items);
      setVendors(pendingVendorsData);
      setLogistics(logisticsData);
      setAnalytics(analyticsData);
      setPendingProducts(pending);
      setActiveProducts(active);
      setRejectedProducts(rejected);
      
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      return;
    }
    
    fetchAdminData();
  }, [userProfile]);

  // Admin functions using Firebase Functions
  const handleVerifyVendor = async (userId, verified) => {
    try {
      const verifyVendorFunction = httpsCallable(functions, 'verifyVendor');
      await verifyVendorFunction({
        userId,
        verified,
        adminId: currentUser.uid
      });
      fetchAdminData();
      alert(`Vendor ${verified ? 'verified' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error updating vendor verification:', error);
      alert('Failed to update vendor verification.');
    }
  };

  const handleResolveDispute = async (disputeId, resolution, refundAmount = 0) => {
    try {
      const dispute = disputes.find(d => d.id === disputeId);
      if (!dispute) return;

      await firebaseService.disputes.resolveDispute(
        disputeId, 
        resolution, 
        refundAmount, 
        dispute.paymentIntentId
      );
      
      fetchAdminData();
      setShowDisputeModal(false);
      alert('Dispute resolved successfully!');
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert('Failed to resolve dispute.');
    }
  };

  const handleApprovePartner = async (partnerId) => {
    try {
      await firebaseService.logistics.updateProfile(partnerId, { status: 'approved' });
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Error approving partner:', error);
    }
  };

  const handleApproveProduct = async (productId) => {
    try {
      const approveProduct = httpsCallable(functions, 'approveProduct');
      await approveProduct({ productId, approved: true, adminId: currentUser.uid });
      await fetchAdminData();
      setShowProductModal(false);
      alert('Product approved.');
    } catch (e) {
      console.error('Approve product failed', e);
      alert('Failed to approve product.');
    }
  };

  const handleRejectProduct = async (productId) => {
    try {
      const approveProduct = httpsCallable(functions, 'approveProduct');
      await approveProduct({ productId, approved: false, reason: rejectionReason, adminId: currentUser.uid });
      setRejectionReason('');
      await fetchAdminData();
      setShowProductModal(false);
      alert('Product rejected and vendor notified.');
    } catch (e) {
      console.error('Reject product failed', e);
      alert('Failed to reject product.');
    }
  };

  const handleRejectPartner = async (partnerId) => {
    try {
      await firebaseService.logistics.updateProfile(partnerId, { status: 'rejected' });
      fetchAdminData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting partner:', error);
    }
  };

  const handleSuspendUser = async (userId, suspended, reason = '') => {
    try {
      const toggleSuspensionFunction = httpsCallable(functions, 'toggleUserSuspension');
      await toggleSuspensionFunction({
        userId,
        suspended,
        reason,
        adminId: currentUser.uid
      });
      fetchAdminData();
      alert(`User ${suspended ? 'suspended' : 'unsuspended'} successfully!`);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status.');
    }
  };

  const handleViewUserDetails = async (userId) => {
    try {
      const userDetails = await firebaseService.admin.getUserDetails(userId);
      setSelectedUser(userDetails);
      setShowUserModal(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Failed to fetch user details.');
    }
  };

  // Filter data for display
  const filteredUsers = useMemo(() => {
    return users.filter(user => user.role !== 'admin');
  }, [users]);

  const filteredDisputes = useMemo(() => {
    return disputes.filter(dispute => dispute.status === 'open');
  }, [disputes]);

  const pendingVendors = useMemo(() => {
    return vendors.filter(vendor => 
      vendor.vendorProfile?.verificationStatus === 'pending'
    );
  }, [vendors]);

  // Render functions for different sections
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₦{(analytics.totalRevenue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Orders</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.activeOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Disputes</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.pendingDisputes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order #{order.id.slice(-8)}</p>
                    <p className="text-sm text-gray-500">{order.buyerName || order.buyerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">₦{(order.totalAmount || 0).toLocaleString()}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
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

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Pending Vendor Verifications</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {pendingVendors.slice(0, 5).map((vendor) => (
                <div key={vendor.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{vendor.displayName}</p>
                    <p className="text-sm text-gray-500">{vendor.vendorProfile?.businessName}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleVerifyVendor(vendor.id, true)}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleVerifyVendor(vendor.id, false)}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pending Products Approval */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Pending Products</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {pendingProducts.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">🖼️</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">Category: {p.category || '—'} • Price: {p.currency || '₦'} {(p.price || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => { setSelectedProduct(p); setShowProductModal(true); }}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
              {pendingProducts.length === 0 && (
                <p className="text-sm text-gray-500">No pending products.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">User Management</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage all platform users</p>
      </div>
      <ul className="divide-y divide-gray-200">
        {filteredUsers.map((user) => (
          <li key={user.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user.displayName?.charAt(0) || user.email?.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-900">{user.displayName || 'No name'}</p>
                    {user.isVendor && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Vendor
                      </span>
                    )}
                    {user.suspended && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-sm text-gray-500">
                    Joined: {user.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedUser(user);
                    setShowUserModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleSuspendUser(user.id, !user.suspended)}
                  className={`text-sm font-medium ${
                    user.suspended 
                      ? 'text-green-600 hover:text-green-900' 
                      : 'text-red-600 hover:text-red-900'
                  }`}
                >
                  {user.suspended ? 'Unsuspend' : 'Suspend'}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderDisputes = () => (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Dispute Resolution</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage and resolve customer disputes</p>
      </div>
      <ul className="divide-y divide-gray-200">
        {filteredDisputes.map((dispute) => (
          <li key={dispute.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Dispute #{dispute.id.slice(-8)}</p>
                <p className="text-sm text-gray-500">Order: {dispute.orderId}</p>
                <p className="text-sm text-gray-500">Amount: ${dispute.disputedAmount?.toFixed(2) || '0.00'}</p>
                <p className="text-sm text-gray-500">Reason: {dispute.reason}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedDispute(dispute);
                    setShowDisputeModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  Resolve
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  if (userProfile?.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage users, orders, disputes, and platform settings</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: '📊' },
            { id: 'users', name: 'Users', icon: '👥' },
            { id: 'orders', name: 'Orders', icon: '📦' },
            { id: 'products', name: 'Products', icon: '🛒' },
            { id: 'disputes', name: 'Disputes', icon: '⚖️' },
            { id: 'vendors', name: 'Vendors', icon: '🏪' },
            { id: 'logistics', name: 'Logistics', icon: '🚚' },
            { id: 'analytics', name: 'Analytics', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'disputes' && renderDisputes()}
      {activeTab === 'orders' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">All Orders</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Monitor all platform orders</p>
          </div>
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
              <li key={order.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order #{order.id.slice(-8)}</p>
                    <p className="text-sm text-gray-500">{order.buyerName || order.buyerEmail}</p>
                    <p className="text-sm text-gray-500">Amount: ${order.totalAmount?.toFixed(2) || '0.00'}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'disputed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Products Moderation</h3>
              <div className="text-sm text-gray-600 flex gap-3">
                <span>Pending: {pendingProducts.length}</span>
                <span>Active: {activeProducts.length}</span>
                <span>Rejected: {rejectedProducts.length}</span>
              </div>
            </div>
            <div className="p-6 grid md:grid-cols-3 gap-6">
              {/* Pending */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Pending</h4>
                <div className="space-y-4">
                  {pendingProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">🖼️</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.category} • {p.currency || '₦'} {(p.price || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedProduct(p); setShowProductModal(true); }} className="text-blue-600 hover:text-blue-700 text-sm font-medium">Review</button>
                    </div>
                  ))}
                  {pendingProducts.length === 0 && (<p className="text-sm text-gray-500">No pending items.</p>)}
                </div>
              </div>

              {/* Active */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Active</h4>
                <div className="space-y-4">
                  {activeProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">🖼️</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.category} • {p.currency || '₦'} {(p.price || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                    </div>
                  ))}
                  {activeProducts.length === 0 && (<p className="text-sm text-gray-500">No active items.</p>)}
                </div>
              </div>

              {/* Rejected */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Rejected</h4>
                <div className="space-y-4">
                  {rejectedProducts.map((p) => (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">🖼️</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.category} • {p.currency || '₦'} {(p.price || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Rejected</span>
                      </div>
                      {p.rejectionReason && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">Reason: {p.rejectionReason}</p>
                      )}
                    </div>
                  ))}
                  {rejectedProducts.length === 0 && (<p className="text-sm text-gray-500">No rejected items.</p>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logistics' && (
        <div className="space-y-6">
          {/* Logistics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Partners</p>
                  <p className="text-2xl font-bold text-gray-900">{logistics.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">🚚</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Partners</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {logistics.filter(p => p.status === 'approved').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {logistics.filter(p => p.status === 'pending').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 text-xl">⏳</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {logistics.filter(p => p.status === 'rejected').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-xl">❌</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logistics Partners Table */}
          <div className="bg-white rounded-xl border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Logistics Partners Management</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Areas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logistics.map((partner) => (
                    <tr key={partner.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-lg">🚚</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{partner.companyName}</div>
                            <div className="text-sm text-gray-500">{partner.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{partner.contactPerson}</div>
                        <div className="text-sm text-gray-500">{partner.email}</div>
                        <div className="text-sm text-gray-500">{partner.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {partner.serviceAreas?.slice(0, 3).map((area, index) => (
                            <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                              {area}
                            </span>
                          ))}
                          {partner.serviceAreas?.length > 3 && (
                            <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                              +{partner.serviceAreas.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          partner.status === 'approved' ? 'bg-green-100 text-green-800' :
                          partner.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {partner.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {partner.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {partner.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleApprovePartner(partner.id)}
                                className="text-green-600 hover:text-green-700 font-medium"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleRejectPartner(partner.id)}
                                className="text-red-600 hover:text-red-700 font-medium"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button className="text-blue-600 hover:text-blue-700 font-medium">
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Logistics Activity */}
          <div className="bg-white rounded-xl border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Logistics Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600">✅</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Swift Logistics approved</p>
                    <p className="text-sm text-gray-600">New logistics partner approved and activated</p>
                  </div>
                  <div className="text-sm text-gray-500">2 hours ago</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600">📦</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Express Delivery completed 15 deliveries</p>
                    <p className="text-sm text-gray-600">Partner completed deliveries this week</p>
                  </div>
                  <div className="text-sm text-gray-500">1 day ago</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600">⏳</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Reliable Transport application pending</p>
                    <p className="text-sm text-gray-600">New logistics partner application awaiting review</p>
                  </div>
                  <div className="text-sm text-gray-500">3 days ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Resolution Modal */}
      {showDisputeModal && selectedDispute && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resolve Dispute</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Dispute ID: {selectedDispute.id}</p>
                  <p className="text-sm text-gray-600">Order ID: {selectedDispute.orderId}</p>
                  <p className="text-sm text-gray-600">Amount: ${selectedDispute.disputedAmount?.toFixed(2) || '0.00'}</p>
                  <p className="text-sm text-gray-600">Reason: {selectedDispute.reason}</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleResolveDispute(selectedDispute.id, 'resolved_in_favor_of_buyer', selectedDispute.disputedAmount)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                  >
                    Favor Buyer (Refund)
                  </button>
                  <button
                    onClick={() => handleResolveDispute(selectedDispute.id, 'resolved_in_favor_of_vendor', 0)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    Favor Vendor
                  </button>
                  <button
                    onClick={() => setShowDisputeModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Review Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Review Product</h3>
                <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Images */}
                <div>
                  <div className="grid grid-cols-3 gap-2">
                    {(selectedProduct.images || []).map((img, idx) => (
                      <div key={idx} className="w-full aspect-square bg-gray-100 rounded overflow-hidden">
                        <img src={img} alt={`image-${idx}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {(!selectedProduct.images || selectedProduct.images.length === 0) && (
                      <div className="text-sm text-gray-500">No images uploaded.</div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-medium text-gray-900">{selectedProduct.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="text-sm font-medium text-gray-900">{selectedProduct.category || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="text-sm font-medium text-gray-900">{selectedProduct.currency || '₦'} {(selectedProduct.price || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedProduct.description || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Vendor</p>
                    <p className="text-sm text-gray-900">{selectedProduct.vendorId || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Approve / Reject */}
              <div className="border-t mt-6 pt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (if rejecting)</label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="Provide a clear reason so the vendor can fix and resubmit"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleApproveProduct(selectedProduct.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectProduct(selectedProduct.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setShowProductModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
