
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
  const [productSearch, setProductSearch] = useState('');

  // Disputes data
  const [disputes, setDisputes] = useState([]);
  const [filteredDisputes, setFilteredDisputes] = useState([]);
  const [disputeFilter, setDisputeFilter] = useState('all');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [disputeOrders, setDisputeOrders] = useState([]);

  // Product management
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productAction, setProductAction] = useState(''); // 'suspend', 'ban', 'reactivate', 'delete'

  // Vendor management
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorAction, setVendorAction] = useState(''); // 'suspend', 'ban', 'reactivate', 'approve'

  // User KYC modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Commission management
  const [commissionSettings, setCommissionSettings] = useState({
    platformCommission: 5.0, // Default 5% - only platform gets commission
    minimumCommission: 50,   // Minimum commission in Naira
    maximumCommission: 5000  // Maximum commission in Naira
  });
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionHistory, setCommissionHistory] = useState([]);

  // Logistics partners data
  const [logisticsPartners, setLogisticsPartners] = useState([]);
  const [filteredLogistics, setFilteredLogistics] = useState([]);
  const [logisticsFilter, setLogisticsFilter] = useState('all'); // all, pending, approved, rejected
  const [selectedLogistics, setSelectedLogistics] = useState(null);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || !userProfile || userProfile.role !== 'admin') {
      // Use setTimeout to ensure Router context is ready
      setTimeout(() => {
        navigate('/');
      }, 0);
      return;
    }

    loadAdminData();
  }, [currentUser, userProfile]);

  useEffect(() => {
    filterUsers();
  }, [users, userFilter, userSearch]);

  useEffect(() => {
    filterOrders();
  }, [orders, orderFilter]);

  useEffect(() => {
    filterProducts();
  }, [products, productFilter, productSearch]);

  useEffect(() => {
    filterLogistics();
  }, [logisticsPartners, logisticsFilter]);

  useEffect(() => {
    filterDisputes();
  }, [disputes, disputeFilter]);

  const filterDisputes = () => {
    let filtered = disputes;

    if (disputeFilter !== 'all') {
      if (disputeFilter === 'open') {
        filtered = filtered.filter(d => d.status === 'pending' || d.status === 'investigating' || d.status === 'open');
      } else if (disputeFilter === 'resolved') {
        filtered = filtered.filter(d => d.status === 'resolved');
      }
    }

    setFilteredDisputes(filtered);
  };

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
              const vendor = await firebaseService.users.getProfile(order.vendorId);
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
      
      // Enrich products with vendor information
      // First, create a map of vendors by ID and email for efficient lookup
      const vendorsById = new Map();
      const vendorsByEmail = new Map();
      usersData.forEach(user => {
        if (user.uid || user.id) {
          vendorsById.set(user.uid || user.id, user);
        }
        if (user.email) {
          vendorsByEmail.set(user.email.toLowerCase(), user);
        }
      });
      
      const enrichedProducts = productsData.map((product) => {
        let vendor = null;
        
        // Try to find vendor by vendorId
        if (product.vendorId) {
          vendor = vendorsById.get(product.vendorId);
        }
        
        // Fallback: try to find vendor by vendorEmail
        if (!vendor && product.vendorEmail) {
          vendor = vendorsByEmail.get(product.vendorEmail.toLowerCase());
        }
        
        // Return product with vendor information
        return {
          ...product,
          vendorName: vendor?.displayName || vendor?.email || product.vendorEmail || 'Unknown',
          vendorEmail: vendor?.email || product.vendorEmail || 'N/A',
          storeName: vendor?.vendorProfile?.storeName || vendor?.storeName || 'N/A'
        };
      });
      
      setProducts(enrichedProducts);

      // Load disputes with pagination
      const disputesResult = await firebaseService.admin.getAllDisputes({ pageSize: 1000 });
      const disputesData = disputesResult.items || [];
      setDisputes(disputesData);

      // Load orders for dispute context
      setDisputeOrders(ordersData);

      // Load logistics partners
      const logisticsData = await firebaseService.logistics.getAllPartners();
      setLogisticsPartners(logisticsData);

      // Load commission settings and history
      try {
        const settings = await firebaseService.admin.getCommissionSettings();
        if (settings) {
          setCommissionSettings(settings);
        }
        await loadCommissionHistory();
      } catch (error) {
        console.error('Error loading commission data:', error);
      }

      // Load featured products
      await loadFeaturedProducts();

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

    // Apply search filter
    if (productSearch.trim()) {
      const searchTerm = productSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(searchTerm) ||
        p.vendorName?.toLowerCase().includes(searchTerm) ||
        p.category?.toLowerCase().includes(searchTerm) ||
        p.brand?.toLowerCase().includes(searchTerm) ||
        p.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (productFilter === 'outOfStock') {
      filtered = filtered.filter(p => (p.stock || p.stockQuantity || 0) === 0);
    } else if (productFilter === 'lowStock') {
      filtered = filtered.filter(p => {
        const stock = p.stock || p.stockQuantity || 0;
        return stock > 0 && stock <= 5;
      });
    } else if (productFilter === 'inactive') {
      filtered = filtered.filter(p => p.status === 'inactive' || p.inStock === false);
    } else if (productFilter === 'suspended') {
      filtered = filtered.filter(p => p.status === 'suspended');
    } else if (productFilter === 'banned') {
      filtered = filtered.filter(p => p.status === 'banned');
    } else if (productFilter === 'featured') {
      filtered = filtered.filter(p => p.isFeatured === true);
    }

    setFilteredProducts(filtered);
  };

  const filterLogistics = () => {
    let filtered = logisticsPartners;

    if (logisticsFilter !== 'all') {
      filtered = filtered.filter(l => l.status === logisticsFilter);
    }

    setFilteredLogistics(filtered);
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

  const handleApproveLogistics = async (profileId) => {
    if (!confirm('Approve this logistics partner?')) return;

    try {
      await firebaseService.logistics.updateProfile(profileId, {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: currentUser.uid
      });
      alert('Logistics partner approved successfully!');
      loadAdminData();
    } catch (error) {
      console.error('Error approving logistics partner:', error);
      alert('Failed to approve logistics partner');
    }
  };

  const handleRejectLogistics = async (profileId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await firebaseService.logistics.updateProfile(profileId, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: currentUser.uid,
        rejectionReason: reason
      });
      alert('Logistics partner rejected');
      loadAdminData();
    } catch (error) {
      console.error('Error rejecting logistics partner:', error);
      alert('Failed to reject logistics partner');
    }
  };

  const handleResolveDispute = async (disputeId, resolution) => {
    if (!resolutionNote.trim()) {
      alert('Please provide a resolution note');
      return;
    }

    try {
      // Get dispute details to determine refund amount
      const dispute = disputes.find(d => d.id === disputeId);
      if (!dispute) {
        alert('Dispute not found');
        return;
      }

      // Determine refund amount based on resolution
      let refundAmount = 0;
      if (resolution === 'favor_buyer') {
        refundAmount = dispute.totalAmount || dispute.disputedAmount || 0;
      } else if (resolution === 'favor_vendor') {
        refundAmount = 0; // No refund, vendor keeps the money
      }

      // Call the proper dispute resolution function that handles escrow money movement
      await firebaseService.disputes.resolveDispute(
        disputeId, 
        resolution, 
        refundAmount * 100, // Convert to cents for Stripe
        dispute.paymentIntentId // Pass payment intent ID if available
      );

      // Update dispute with admin resolution details
      await firebaseService.disputes.update(disputeId, {
        resolutionNote,
        resolvedBy: currentUser.uid,
        adminResolution: true
      });

      alert(`Dispute resolved successfully in favor of ${resolution === 'favor_buyer' ? 'buyer' : 'vendor'}. ${refundAmount > 0 ? `Refund of ₦${refundAmount.toLocaleString()} processed.` : 'No refund issued.'}`);
      setSelectedDispute(null);
      setResolutionNote('');
      loadAdminData();
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert(`Failed to resolve dispute: ${error.message}`);
    }
  };

  // Product management functions
  const handleProductAction = async (productId, action) => {
    if (!confirm(`Are you sure you want to ${action} this product?`)) return;

    try {
      let updates = {};
      
      switch (action) {
        case 'suspend':
          updates = {
            status: 'suspended',
            suspendedAt: new Date(),
            suspendedBy: currentUser.uid
          };
          break;
        case 'ban':
          updates = {
            status: 'banned',
            bannedAt: new Date(),
            bannedBy: currentUser.uid
          };
          break;
        case 'reactivate':
          updates = {
            status: 'active',
            reactivatedAt: new Date(),
            reactivatedBy: currentUser.uid
          };
          break;
        case 'delete':
          await firebaseService.products.delete(productId);
          alert('Product deleted successfully');
          loadAdminData();
          return;
        default:
          return;
      }

      await firebaseService.products.update(productId, updates);
      alert(`Product ${action}ed successfully`);
      loadAdminData();
    } catch (error) {
      console.error(`Error ${action}ing product:`, error);
      alert(`Failed to ${action} product`);
    }
  };

  // Featured product management
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [selectedFeaturedProducts, setSelectedFeaturedProducts] = useState([]);
  const [featuredSearch, setFeaturedSearch] = useState('');
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);

  const handleFeaturedToggle = async (productId, isFeatured) => {
    try {
      await firebaseService.admin.setProductFeatured(productId, isFeatured);
      
      // Update local state
      setProducts(products.map(p => 
        p.id === productId ? { ...p, isFeatured, featuredAt: isFeatured ? new Date() : null } : p
      ));
      
      // Update featured products list
      if (isFeatured) {
        const product = products.find(p => p.id === productId);
        if (product) {
          setFeaturedProducts(prev => [...prev, { ...product, isFeatured: true, featuredAt: new Date() }]);
        }
      } else {
        setFeaturedProducts(prev => prev.filter(p => p.id !== productId));
      }
      
      console.log(`Product ${isFeatured ? 'featured' : 'unfeatured'} successfully`);
    } catch (error) {
      console.error('Error updating featured status:', error);
      alert('Failed to update featured status');
    }
  };

  const loadFeaturedProducts = async () => {
    try {
      const featured = await firebaseService.admin.getFeaturedProducts();
      setFeaturedProducts(featured);
    } catch (error) {
      console.error('Error loading featured products:', error);
    }
  };

  const handleBulkFeaturedToggle = async (productIds, isFeatured) => {
    try {
      const promises = productIds.map(id => firebaseService.admin.setProductFeatured(id, isFeatured));
      await Promise.all(promises);
      
      // Update local state
      setProducts(products.map(p => 
        productIds.includes(p.id) ? { ...p, isFeatured, featuredAt: isFeatured ? new Date() : null } : p
      ));
      
      if (isFeatured) {
        const newFeatured = products.filter(p => productIds.includes(p.id));
        setFeaturedProducts(prev => [...prev, ...newFeatured.map(p => ({ ...p, isFeatured: true, featuredAt: new Date() }))]);
      } else {
        setFeaturedProducts(prev => prev.filter(p => !productIds.includes(p.id)));
      }
      
      setSelectedFeaturedProducts([]);
      console.log(`Bulk ${isFeatured ? 'feature' : 'unfeature'} successful`);
    } catch (error) {
      console.error('Error bulk updating featured status:', error);
      alert('Failed to update featured status');
    }
  };

  const handleSelectFeaturedProduct = (productId) => {
    setSelectedFeaturedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAllFeatured = () => {
    const allIds = featuredProducts.map(p => p.id);
    setSelectedFeaturedProducts(
      selectedFeaturedProducts.length === allIds.length ? [] : allIds
    );
  };

  // Vendor management functions
  const handleVendorAction = async (vendorId, action) => {
    if (!confirm(`Are you sure you want to ${action} this vendor?`)) return;

    try {
      let updates = {};
      
      switch (action) {
        case 'suspend':
          updates = {
            suspended: true,
            suspendedAt: new Date(),
            suspendedBy: currentUser.uid
          };
          break;
        case 'ban':
          updates = {
            banned: true,
            bannedAt: new Date(),
            bannedBy: currentUser.uid
          };
          break;
        case 'reactivate':
          updates = {
            suspended: false,
            banned: false,
            reactivatedAt: new Date(),
            reactivatedBy: currentUser.uid
          };
          break;
        case 'approve':
          updates = {
            vendorApproved: true,
            approvedAt: new Date(),
            approvedBy: currentUser.uid
          };
          break;
        default:
          return;
      }

      await firebaseService.users.update(vendorId, updates);
      alert(`Vendor ${action}ed successfully`);
      loadAdminData();
    } catch (error) {
      console.error(`Error ${action}ing vendor:`, error);
      alert(`Failed to ${action} vendor`);
    }
  };

  // Commission management functions
  const handleCommissionUpdate = async (newSettings) => {
    try {
      // Save commission settings to Firestore
      await firebaseService.admin.updateCommissionSettings(newSettings);
      setCommissionSettings(newSettings);
      alert('Commission settings updated successfully');
      setShowCommissionModal(false);
      loadCommissionHistory();
    } catch (error) {
      console.error('Error updating commission settings:', error);
      alert('Failed to update commission settings');
    }
  };

  const loadCommissionHistory = async () => {
    try {
      // Load commission history from Firestore
      const history = await firebaseService.admin.getCommissionHistory();
      // History is already an array (not { items })
      setCommissionHistory(Array.isArray(history) ? history : history?.items || []);
    } catch (error) {
      console.error('Error loading commission history:', error);
      setCommissionHistory([]);
    }
  };

  const calculateCommission = (amount) => {
    const rate = commissionSettings.platformCommission || 0;
    const calculatedCommission = (amount * rate) / 100;
    
    // Apply minimum and maximum limits
    const minCommission = commissionSettings.minimumCommission || 0;
    const maxCommission = commissionSettings.maximumCommission || Infinity;
    
    return Math.max(minCommission, Math.min(maxCommission, calculatedCommission));
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
        <div className="bg-slate-950 rounded-lg shadow mb-6 border border-teal-900/70">
          <div className="border-b border-teal-900/70">
            <nav className="flex -mb-px">
              {['overview', 'users', 'orders', 'products', 'featured', 'logistics', 'disputes', 'commission'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-teal-300/80 hover:text-amber-300 hover:border-teal-700/60'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6 bg-slate-950">
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
                      {filteredUsers.map(user => {
                        const isVendor = user.role === 'vendor';
                        const isSuspended = user.suspended;
                        const isBanned = user.banned;
                        const isApproved = user.vendorApproved;
                        
                        return (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{user.displayName || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                              {isVendor && user.vendorProfile?.storeName && (
                                <div className="text-xs text-blue-600">{user.vendorProfile.storeName}</div>
                              )}
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
                              <div className="space-y-1">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  isBanned ? 'bg-red-100 text-red-800' :
                                  isSuspended ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                            }`}>
                                  {isBanned ? 'Banned' : isSuspended ? 'Suspended' : 'Active'}
                            </span>
                                {isVendor && (
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {isApproved ? 'Approved' : 'Pending'}
                                  </span>
                                )}
                              </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowUserModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  View KYC
                                </button>
                                {isVendor && (
                                  <button
                                    onClick={() => {
                                      setSelectedVendor(user);
                                      setShowVendorModal(true);
                                    }}
                                    className="text-green-600 hover:text-green-900 font-medium"
                                  >
                                    View Details
                                  </button>
                                )}
                            {user.role !== 'admin' && (
                                  <>
                                    {!isBanned && (
                              <button
                                        onClick={() => handleVendorAction(user.id, isSuspended ? 'reactivate' : 'suspend')}
                                        className={`px-2 py-1 text-xs rounded ${
                                          isSuspended 
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                }`}
                              >
                                        {isSuspended ? 'Reactivate' : 'Suspend'}
                              </button>
                            )}
                                    {!isBanned && (
                                      <button
                                        onClick={() => handleVendorAction(user.id, 'ban')}
                                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                      >
                                        Ban
                                      </button>
                                    )}
                                    {isBanned && (
                                      <button
                                        onClick={() => handleVendorAction(user.id, 'reactivate')}
                                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                      >
                                        Reactivate
                                      </button>
                                    )}
                                    {isVendor && !isApproved && (
                                      <button
                                        onClick={() => handleVendorAction(user.id, 'approve')}
                                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                      >
                                        Approve
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                          </td>
                        </tr>
                        );
                      })}
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
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search products by name, vendor, category, brand..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Products</option>
                      <option value="featured">Featured</option>
                      <option value="outOfStock">Out of Stock</option>
                      <option value="lowStock">Low Stock</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="banned">Banned</option>
                    </select>
                    <div className="px-4 py-2 bg-gray-100 rounded-md text-sm text-gray-600 flex items-center">
                      {filteredProducts.length} products
                    </div>
                    <button
                      onClick={() => setActiveTab('featured')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700 transition-colors flex items-center"
                    >
                      <span className="mr-2">⭐</span>
                      View Featured ({featuredProducts.length})
                    </button>
                  </div>
                </div>

                {/* Quick Featured Actions */}
                {selectedFeaturedProducts.length > 0 && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-yellow-600 mr-2">⭐</span>
                        <span className="text-sm font-medium text-yellow-800">
                          {selectedFeaturedProducts.length} products selected
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBulkFeaturedToggle(selectedFeaturedProducts, true)}
                          className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                        >
                          Add to Featured
                        </button>
                        <button
                          onClick={() => setSelectedFeaturedProducts([])}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedFeaturedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                            onChange={() => {
                              const allIds = filteredProducts.map(p => p.id);
                              setSelectedFeaturedProducts(
                                selectedFeaturedProducts.length === allIds.length ? [] : allIds
                              );
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Featured</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.slice(0, 50).map(product => {
                    const stock = product.stock || product.stockQuantity || 0;
                        const isSuspended = product.status === 'suspended';
                        const isBanned = product.status === 'banned';
                        const isInactive = product.status === 'inactive' || product.inStock === false;
                        
                    return (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <input
                                type="checkbox"
                                checked={selectedFeaturedProducts.includes(product.id)}
                                onChange={() => handleSelectFeaturedProduct(product.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                          {product.images && product.images[0] && (
                            <img 
                              src={product.images[0]} 
                              alt={product.name}
                                    className="w-12 h-12 object-cover rounded-md mr-3"
                                  />
                                )}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-500">{product.category}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {product.vendorName || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                {formatCurrency(product.price || 0)}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                stock === 0 ? 'bg-red-100 text-red-800' :
                                stock <= 5 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {stock}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                isBanned ? 'bg-red-100 text-red-800' :
                                isSuspended ? 'bg-yellow-100 text-yellow-800' :
                                isInactive ? 'bg-gray-100 text-gray-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {isBanned ? 'Banned' : isSuspended ? 'Suspended' : isInactive ? 'Inactive' : 'Active'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleFeaturedToggle(product.id, !product.isFeatured)}
                                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                  product.isFeatured 
                                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {product.isFeatured ? '⭐ Featured' : '☆ Not Featured'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowProductModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  View Details
                                </button>
                                {!isBanned && (
                                  <button
                                    onClick={() => handleProductAction(product.id, isSuspended ? 'reactivate' : 'suspend')}
                                    className={`px-2 py-1 text-xs rounded ${
                                      isSuspended 
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                    }`}
                                  >
                                    {isSuspended ? 'Reactivate' : 'Suspend'}
                                  </button>
                                )}
                                {!isBanned && (
                                  <button
                                    onClick={() => handleProductAction(product.id, 'ban')}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    Ban
                                  </button>
                                )}
                                {isBanned && (
                                  <button
                                    onClick={() => handleProductAction(product.id, 'reactivate')}
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  >
                                    Reactivate
                                  </button>
                                )}
                                <button
                                  onClick={() => handleProductAction(product.id, 'delete')}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >
                                  Delete
                                </button>
                            </div>
                            </td>
                          </tr>
                    );
                  })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Featured Products Tab */}
            {activeTab === 'featured' && (
              <div>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Featured Products List */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Search featured products..."
                          value={featuredSearch}
                          onChange={(e) => setFeaturedSearch(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSelectAllFeatured}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
                        >
                          {selectedFeaturedProducts.length === featuredProducts.length ? 'Deselect All' : 'Select All'}
                        </button>
                        {selectedFeaturedProducts.length > 0 && (
                          <button
                            onClick={() => handleBulkFeaturedToggle(selectedFeaturedProducts, false)}
                            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                          >
                            Remove Selected ({selectedFeaturedProducts.length})
                          </button>
                        )}
                        <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium">
                          ⭐ {featuredProducts.length} Featured
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {featuredProducts
                          .filter(product => 
                            !featuredSearch.trim() || 
                            product.name?.toLowerCase().includes(featuredSearch.toLowerCase()) ||
                            product.vendorName?.toLowerCase().includes(featuredSearch.toLowerCase()) ||
                            product.category?.toLowerCase().includes(featuredSearch.toLowerCase())
                          )
                          .map(product => (
                          <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={selectedFeaturedProducts.includes(product.id)}
                                  onChange={() => handleSelectFeaturedProduct(product.id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-yellow-500 text-lg">⭐</span>
                              </div>
                              <button
                                onClick={() => handleFeaturedToggle(product.id, false)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Remove
                              </button>
                            </div>
                            
                            {product.images && product.images[0] && (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="w-full h-32 object-cover rounded-md mb-3"
                              />
                            )}
                            
                            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">{product.vendorName || 'Unknown Vendor'}</p>
                            <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                            <p className="text-lg font-bold text-emerald-600">{formatCurrency(product.price || 0)}</p>
                            
                            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                              <span>Stock: {product.stock || product.stockQuantity || 0}</span>
                              <span>Featured: {product.featuredAt ? new Date(product.featuredAt.seconds * 1000).toLocaleDateString() : 'Recently'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {featuredProducts.length === 0 && (
                        <div className="text-center py-12">
                          <div className="text-6xl mb-4">⭐</div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No Featured Products</h3>
                          <p className="text-gray-500 mb-4">Start featuring products to highlight them on the homepage</p>
                          <button
                            onClick={() => setActiveTab('products')}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                          >
                            Go to Products
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Featured Products Preview */}
                  <div className="w-full lg:w-80">
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="text-yellow-500 mr-2">⭐</span>
                        Homepage Preview
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        This is how featured products appear on the homepage
                      </p>
                      
                      <div className="space-y-3">
                        {featuredProducts.slice(0, 3).map((product, index) => (
                          <div key={product.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                            {product.images && product.images[0] && (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-md"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs text-gray-500">{formatCurrency(product.price || 0)}</p>
                            </div>
                          </div>
                        ))}
                        
                        {featuredProducts.length > 3 && (
                          <div className="text-center text-sm text-gray-500 py-2">
                            +{featuredProducts.length - 3} more products
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-yellow-200">
                        <div className="text-xs text-gray-600">
                          <p><strong>Total Featured:</strong> {featuredProducts.length}</p>
                          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logistics Tab */}
            {activeTab === 'logistics' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-sm text-gray-600">{filteredLogistics.length} logistics partners</p>
                  </div>
                  <select
                    value={logisticsFilter}
                    onChange={(e) => setLogisticsFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {filteredLogistics.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No logistics partners found</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Areas</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLogistics.map(partner => (
                          <tr key={partner.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{partner.companyName}</div>
                              <div className="text-sm text-gray-500">{partner.city}, {partner.state}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{partner.contactPerson}</div>
                              <div className="text-sm text-gray-500">{partner.email}</div>
                              <div className="text-sm text-gray-500">{partner.phone}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {partner.serviceAreas && partner.serviceAreas.slice(0, 2).map((area, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                    {area.state}
                                  </span>
                                ))}
                                {partner.serviceAreas && partner.serviceAreas.length > 2 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                    +{partner.serviceAreas.length - 2} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ₦{partner.ratePerKm}/km
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                partner.status === 'approved' ? 'bg-green-100 text-green-800' :
                                partner.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {partner.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => {
                                  setSelectedLogistics(partner);
                                  setShowLogisticsModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900 font-medium"
                              >
                                View Details →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Logistics Partner Details Modal */}
                {showLogisticsModal && selectedLogistics && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">{selectedLogistics.companyName}</h2>
                          <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${
                            selectedLogistics.status === 'approved' ? 'bg-green-100 text-green-800' :
                            selectedLogistics.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedLogistics.status || 'pending'}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setShowLogisticsModal(false);
                            setSelectedLogistics(null);
                          }}
                          className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                          ×
                        </button>
                      </div>

                      <div className="p-6 space-y-6">
                        {/* Contact Information */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">📞 Contact Information</h3>
                          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                              <p className="text-sm text-gray-600">Contact Person</p>
                              <p className="text-sm font-medium text-gray-900">{selectedLogistics.contactPerson}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Email</p>
                              <p className="text-sm font-medium text-gray-900">{selectedLogistics.email}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Phone</p>
                              <p className="text-sm font-medium text-gray-900">{selectedLogistics.phone}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Address</p>
                              <p className="text-sm font-medium text-gray-900">{selectedLogistics.address}, {selectedLogistics.city}, {selectedLogistics.state}, {selectedLogistics.country}</p>
                            </div>
                          </div>
                        </div>

                        {/* Business Information */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">🏢 Business Information</h3>
                          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                              <p className="text-sm text-gray-600">Business License</p>
                              <p className="text-sm font-medium text-gray-900">{selectedLogistics.businessLicense || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Tax ID</p>
                              <p className="text-sm font-medium text-gray-900">{selectedLogistics.taxId || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Max Weight</p>
                              <p className="text-sm font-medium text-gray-900">{selectedLogistics.maxWeight} kg</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Max Distance</p>
                              <p className="text-sm font-medium text-gray-900">{selectedLogistics.maxDistance} km</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Rate per KM</p>
                              <p className="text-sm font-medium text-gray-900">₦{selectedLogistics.ratePerKm}/km</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Estimated Delivery</p>
                              <p className="text-sm font-medium text-gray-900">{selectedLogistics.estimatedDeliveryDays} days</p>
                            </div>
                          </div>
                        </div>

                        {/* Service Areas */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">📍 Service Areas</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedLogistics.serviceAreas && selectedLogistics.serviceAreas.map((area, idx) => (
                              <span key={idx} className="px-3 py-2 bg-blue-100 text-blue-800 text-sm rounded-lg">
                                {area.state}, {area.country}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Vehicle & Delivery Types */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">🚚 Vehicle Types</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedLogistics.vehicleTypes && selectedLogistics.vehicleTypes.map((type, idx) => (
                                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded">
                                  {type}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">⚡ Delivery Types</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedLogistics.deliveryTypes && selectedLogistics.deliveryTypes.map((type, idx) => (
                                <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded">
                                  {type}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Features */}
                        {selectedLogistics.features && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">✨ Features</h3>
                            <div className="flex flex-wrap gap-3">
                              {selectedLogistics.features.insurance && (
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded">✓ Insurance</span>
                              )}
                              {selectedLogistics.features.tracking && (
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded">✓ Tracking</span>
                              )}
                              {selectedLogistics.features.signatureRequired && (
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded">✓ Signature Required</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {selectedLogistics.description && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">📝 Description</h3>
                            <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedLogistics.description}</p>
                          </div>
                        )}

                        {/* Rejection Reason */}
                        {selectedLogistics.rejectionReason && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <h3 className="text-lg font-semibold text-red-900 mb-2">❌ Rejection Reason</h3>
                            <p className="text-sm text-red-800">{selectedLogistics.rejectionReason}</p>
                          </div>
                        )}

                        {/* Approval/Rejection Actions */}
                        {selectedLogistics.status === 'pending' && (
                          <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => {
                                handleApproveLogistics(selectedLogistics.id);
                                setShowLogisticsModal(false);
                              }}
                              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                            >
                              ✓ Approve Partner
                            </button>
                            <button
                              onClick={() => {
                                handleRejectLogistics(selectedLogistics.id);
                                setShowLogisticsModal(false);
                              }}
                              className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                              ✗ Reject Partner
                            </button>
                          </div>
                        )}

                        {/* Approval/Rejection Status */}
                        {selectedLogistics.status === 'approved' && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800">
                              ✓ Approved on {selectedLogistics.approvedAt ? new Date(selectedLogistics.approvedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        )}

                        {selectedLogistics.status === 'rejected' && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">
                              ✗ Rejected on {selectedLogistics.rejectedAt ? new Date(selectedLogistics.rejectedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Disputes Tab */}
            {activeTab === 'disputes' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                  <p className="text-sm text-gray-600">{disputes.length} disputes</p>
                  </div>
                  <select
                    value={disputeFilter}
                    onChange={(e) => setDisputeFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All Disputes</option>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                {filteredDisputes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No disputes found</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredDisputes.map(dispute => {
                      // Find related order
                      const relatedOrder = disputeOrders.find(order => order.id === dispute.orderId);
                      
                      return (
                        <div key={dispute.id} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                          {/* Dispute Header */}
                          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                Dispute #{dispute.id.slice(0, 8)}
                                </h3>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                  dispute.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {dispute.status.toUpperCase()}
                              </span>
                            </div>
                              <div className="text-sm text-gray-500">
                                <p>Created: {formatDate(dispute.createdAt)}</p>
                                {dispute.resolvedAt && (
                                  <p>Resolved: {formatDate(dispute.resolvedAt)}</p>
                                )}
                            </div>
                          </div>
                          </div>

                          <div className="p-6">
                            {/* Dispute Description */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Dispute Description</h4>
                              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{dispute.description}</p>
                            </div>

                            {/* Order Details */}
                            {relatedOrder && (
                              <div className="mb-6">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">📦 Order Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                                  <div>
                                    <p className="text-xs text-gray-600">Order ID</p>
                                    <p className="text-sm font-medium text-gray-900">{relatedOrder.id}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Order Status</p>
                                    <p className="text-sm font-medium text-gray-900">{relatedOrder.status}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Order Date</p>
                                    <p className="text-sm font-medium text-gray-900">{formatDate(relatedOrder.createdAt)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Total Amount</p>
                                    <p className="text-sm font-medium text-gray-900">{formatCurrency(relatedOrder.totalAmount || 0)}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Parties Involved */}
                            <div className="mb-6">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">👥 Parties Involved</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Buyer */}
                                <div className="bg-green-50 p-4 rounded-lg">
                                  <h5 className="text-sm font-semibold text-green-800 mb-2">🛒 Buyer</h5>
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-600">Name</p>
                                    <p className="text-sm font-medium text-gray-900">{dispute.buyerName || 'Unknown'}</p>
                                    <p className="text-xs text-gray-600">Email</p>
                                    <p className="text-sm font-medium text-gray-900">{dispute.buyerEmail || 'N/A'}</p>
                                    <p className="text-xs text-gray-600">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">{dispute.buyerPhone || 'N/A'}</p>
                                  </div>
                                </div>

                                {/* Vendor */}
                                <div className="bg-blue-50 p-4 rounded-lg">
                                  <h5 className="text-sm font-semibold text-blue-800 mb-2">🏪 Vendor</h5>
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-600">Name</p>
                                    <p className="text-sm font-medium text-gray-900">{dispute.vendorName || 'Unknown'}</p>
                                    <p className="text-xs text-gray-600">Email</p>
                                    <p className="text-sm font-medium text-gray-900">{dispute.vendorEmail || 'N/A'}</p>
                                    <p className="text-xs text-gray-600">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">{dispute.vendorPhone || 'N/A'}</p>
                                  </div>
                                </div>

                                {/* Logistics */}
                                <div className="bg-purple-50 p-4 rounded-lg">
                                  <h5 className="text-sm font-semibold text-purple-800 mb-2">🚚 Logistics</h5>
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-600">Company</p>
                                    <p className="text-sm font-medium text-gray-900">{dispute.logisticsCompany || 'Unknown'}</p>
                                    <p className="text-xs text-gray-600">Contact</p>
                                    <p className="text-sm font-medium text-gray-900">{dispute.logisticsContact || 'N/A'}</p>
                                    <p className="text-xs text-gray-600">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">{dispute.logisticsPhone || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Tracking Information */}
                            {relatedOrder?.trackingNumber && (
                              <div className="mb-6">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">📋 Tracking Information</h4>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-xs text-gray-600">Tracking Number</p>
                                      <p className="text-sm font-medium text-gray-900">{relatedOrder.trackingNumber}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-600">Tracking Status</p>
                                      <p className="text-sm font-medium text-gray-900">{relatedOrder.trackingStatus || 'Unknown'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-600">Estimated Delivery</p>
                                      <p className="text-sm font-medium text-gray-900">{relatedOrder.estimatedDelivery ? formatDate(relatedOrder.estimatedDelivery) : 'N/A'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-600">Delivery Address</p>
                                      <p className="text-sm font-medium text-gray-900">{relatedOrder.deliveryAddress || 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Admin Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                              {dispute.status === 'open' && (
                            <button
                              onClick={() => setSelectedDispute(dispute)}
                                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                  Resolve Dispute
                            </button>
                          )}
                              <button
                                onClick={() => {
                                  // Open contact modal or external call system
                                  alert('Contact system integration needed');
                                }}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Contact Parties
                              </button>
                        </div>
                      </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Commission Tab */}
            {activeTab === 'commission' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Commission Management</h2>
                    <p className="text-sm text-gray-600">Manage platform commission rates and settings</p>
                  </div>
                  <button
                    onClick={() => setShowCommissionModal(true)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Update Settings
                  </button>
                </div>

                {/* Current Commission Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Platform Commission</p>
                        <p className="text-2xl font-bold text-gray-900">{commissionSettings.platformCommission}%</p>
                        <p className="text-xs text-gray-500 mt-1">Only platform takes commission</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-full">
                        <span className="text-2xl">🏢</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Vendors</p>
                        <p className="text-2xl font-bold text-green-600">No Commission</p>
                        <p className="text-xs text-gray-500 mt-1">Vendors keep their profit</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-full">
                        <span className="text-2xl">🏪</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Logistics</p>
                        <p className="text-2xl font-bold text-purple-600">Fixed Fee</p>
                        <p className="text-xs text-gray-500 mt-1">Logistics charge their own fees</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-full">
                        <span className="text-2xl">🚚</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commission Range */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Platform Commission Range</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(commissionSettings.minimumCommission)} - {formatCurrency(commissionSettings.maximumCommission)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Minimum and maximum commission limits</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <span className="text-2xl">💰</span>
                    </div>
                  </div>
                </div>

                {/* Commission Calculator */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Commission Calculator</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transaction Amount (₦)
                      </label>
                      <input
                        type="number"
                        placeholder="Enter amount"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          // Update commission calculations in real-time
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Platform Commission</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(calculateCommission(10000))}
                      </p>
                      <p className="text-xs text-gray-500">({commissionSettings.platformCommission}% of transaction)</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Vendor Receives</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(10000 - calculateCommission(10000))}
                      </p>
                      <p className="text-xs text-gray-500">Transaction amount minus platform commission</p>
                    </div>
                  </div>
                </div>

                {/* Commission History */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Commission History</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform Commission</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor Receives</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logistics Fee</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {commissionHistory.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                              No commission history available
                            </td>
                          </tr>
                        ) : (
                          commissionHistory.map((record, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(record.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                #{record.orderId?.slice(0, 8)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(record.amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                                {formatCurrency(record.platformCommission)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                {formatCurrency(record.vendorReceives)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                                {formatCurrency(record.logisticsFee || 0)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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

      {/* Product Details Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h2>
                <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${
                  selectedProduct.status === 'banned' ? 'bg-red-100 text-red-800' :
                  selectedProduct.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                  selectedProduct.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {selectedProduct.status || 'active'}
                </span>
              </div>
              <button
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Product Images */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📸 Images</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedProduct.images.map((image, idx) => (
                      <img
                        key={idx}
                        src={image}
                        alt={`${selectedProduct.name} ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Product Videos */}
              {selectedProduct.videos && selectedProduct.videos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎥 Videos</h3>
                  <div className="space-y-4">
                    {selectedProduct.videos.map((video, idx) => (
                      <video
                        key={idx}
                        controls
                        className="w-full max-w-md rounded-lg"
                      >
                        <source src={video} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Details */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="text-sm font-medium text-gray-900">{selectedProduct.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Category</p>
                      <p className="text-sm font-medium text-gray-900">{selectedProduct.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Price</p>
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(selectedProduct.price || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Stock</p>
                      <p className="text-sm font-medium text-gray-900">{selectedProduct.stock || selectedProduct.stockQuantity || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Vendor</p>
                      <p className="text-sm font-medium text-gray-900">{selectedProduct.vendorName || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📝 Description</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {selectedProduct.description || 'No description available'}
                  </p>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Admin Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      handleFeaturedToggle(selectedProduct.id, !selectedProduct.isFeatured);
                      setShowProductModal(false);
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedProduct.isFeatured 
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    {selectedProduct.isFeatured ? '⭐ Remove from Featured' : '☆ Add to Featured'}
                  </button>
                  {selectedProduct.status !== 'suspended' && (
                    <button
                      onClick={() => {
                        handleProductAction(selectedProduct.id, 'suspend');
                        setShowProductModal(false);
                      }}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      Suspend Product
                    </button>
                  )}
                  {selectedProduct.status === 'suspended' && (
                    <button
                      onClick={() => {
                        handleProductAction(selectedProduct.id, 'reactivate');
                        setShowProductModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Reactivate Product
                    </button>
                  )}
                  {selectedProduct.status !== 'banned' && (
                    <button
                      onClick={() => {
                        handleProductAction(selectedProduct.id, 'ban');
                        setShowProductModal(false);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Ban Product
                    </button>
                  )}
                  {selectedProduct.status === 'banned' && (
                    <button
                      onClick={() => {
                        handleProductAction(selectedProduct.id, 'reactivate');
                        setShowProductModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Unban Product
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleProductAction(selectedProduct.id, 'delete');
                      setShowProductModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Details Modal */}
      {showVendorModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedVendor.displayName || 'Unknown Vendor'}</h2>
                <div className="flex gap-2 mt-2">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    selectedVendor.banned ? 'bg-red-100 text-red-800' :
                    selectedVendor.suspended ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedVendor.banned ? 'Banned' : selectedVendor.suspended ? 'Suspended' : 'Active'}
                  </span>
                  {selectedVendor.vendorApproved && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      Approved
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowVendorModal(false);
                  setSelectedVendor(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Vendor Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">👤 Vendor Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.displayName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{selectedVendor.phoneNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Joined</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedVendor.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Store Information */}
              {selectedVendor.vendorProfile && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🏪 Store Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Store Name</p>
                      <p className="text-sm font-medium text-gray-900">{selectedVendor.vendorProfile.storeName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Business Name</p>
                      <p className="text-sm font-medium text-gray-900">{selectedVendor.vendorProfile.businessName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Business Type</p>
                      <p className="text-sm font-medium text-gray-900">{selectedVendor.vendorProfile.businessType || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">NIN</p>
                      <p className="text-sm font-medium text-gray-900">{selectedVendor.vendorProfile.nin || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Business Address</p>
                      <p className="text-sm font-medium text-gray-900">{selectedVendor.vendorProfile.businessAddress || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Store Description</p>
                      <p className="text-sm font-medium text-gray-900">{selectedVendor.vendorProfile.storeDescription || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Admin Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {!selectedVendor.banned && (
                    <button
                      onClick={() => {
                        handleVendorAction(selectedVendor.id, selectedVendor.suspended ? 'reactivate' : 'suspend');
                        setShowVendorModal(false);
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        selectedVendor.suspended 
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-yellow-600 text-white hover:bg-yellow-700'
                      }`}
                    >
                      {selectedVendor.suspended ? 'Reactivate Vendor' : 'Suspend Vendor'}
                    </button>
                  )}
                  {!selectedVendor.banned && (
                    <button
                      onClick={() => {
                        handleVendorAction(selectedVendor.id, 'ban');
                        setShowVendorModal(false);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Ban Vendor
                    </button>
                  )}
                  {selectedVendor.banned && (
                    <button
                      onClick={() => {
                        handleVendorAction(selectedVendor.id, 'reactivate');
                        setShowVendorModal(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Unban Vendor
                    </button>
                  )}
                  {!selectedVendor.vendorApproved && (
                    <button
                      onClick={() => {
                        handleVendorAction(selectedVendor.id, 'approve');
                        setShowVendorModal(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Approve Vendor
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User KYC Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">KYC Information</h2>
                <p className="text-sm text-gray-600">{selectedUser.displayName || 'Unknown User'} - {selectedUser.role?.toUpperCase() || 'USER'}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">👤 Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="text-sm font-medium text-gray-900">{selectedUser.displayName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-sm font-medium text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="text-sm font-medium text-gray-900">{selectedUser.phoneNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="text-sm font-medium text-gray-900">{selectedUser.dateOfBirth || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Gender</p>
                    <p className="text-sm font-medium text-gray-900">{selectedUser.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Account Created</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* NIN Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🆔 NIN Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">NIN Number</p>
                    <p className="text-sm font-medium text-gray-900">{selectedUser.nin || 'Not Provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">NIN Status</p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedUser.nin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedUser.nin ? 'Verified' : 'Not Provided'}
                    </span>
                  </div>
                </div>
                
                {/* NIN Document Images */}
                {selectedUser.ninDocument && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">NIN Document</p>
                    <div className="grid grid-cols-2 gap-4">
                      {Array.isArray(selectedUser.ninDocument) ? (
                        selectedUser.ninDocument.map((doc, idx) => (
                          <img
                            key={idx}
                            src={doc}
                            alt={`NIN Document ${idx + 1}`}
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                          />
                        ))
                      ) : (
                        <img
                          src={selectedUser.ninDocument}
                          alt="NIN Document"
                          className="w-full h-48 object-cover rounded-lg border border-gray-200"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🏠 Address Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Street Address</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.address || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">City</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.city || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">State</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.state || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.country || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information (for vendors) */}
              {selectedUser.role === 'vendor' && selectedUser.vendorProfile && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🏪 Business Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Business Name</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.vendorProfile.businessName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Business Type</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.vendorProfile.businessType || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Business Registration Number</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.vendorProfile.businessRegistrationNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Business Address</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.vendorProfile.businessAddress || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Logistics Information (for logistics partners) */}
              {selectedUser.role === 'logistics' && selectedUser.logisticsProfile && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🚚 Logistics Information</h3>
                  <div className="grid grid-cols-2 gap-4 bg-purple-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Company Name</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.logisticsProfile.companyName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Company Registration</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.logisticsProfile.companyRegistration || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Service Areas</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.logisticsProfile.serviceAreas?.join(', ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fleet Size</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.logisticsProfile.fleetSize || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Verification Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">✅ Verification Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Email</p>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedUser.emailVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedUser.emailVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Phone</p>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedUser.phoneVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedUser.phoneVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">NIN</p>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedUser.nin ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedUser.nin ? 'Provided' : 'Missing'}
                    </span>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">KYC Complete</p>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedUser.kycComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedUser.kycComplete ? 'Complete' : 'Incomplete'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Admin Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      // Mark KYC as verified
                      alert('KYC verification action needed');
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Verify KYC
                  </button>
                  <button
                    onClick={() => {
                      // Request additional documents
                      alert('Request additional documents action needed');
                    }}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Request Documents
                  </button>
                  <button
                    onClick={() => {
                      // Download KYC documents
                      alert('Download KYC documents action needed');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download Documents
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Settings Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Update Commission Settings</h3>
              <button
                onClick={() => setShowCommissionModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleCommissionUpdate(commissionSettings);
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Platform Commission */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform Commission (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={commissionSettings.platformCommission}
                    onChange={(e) => setCommissionSettings(prev => ({
                      ...prev,
                      platformCommission: parseFloat(e.target.value) || 0
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Percentage taken by the platform (only commission)</p>
                </div>

                {/* Minimum Commission */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Commission (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={commissionSettings.minimumCommission}
                    onChange={(e) => setCommissionSettings(prev => ({
                      ...prev,
                      minimumCommission: parseFloat(e.target.value) || 0
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum commission amount in Naira</p>
                </div>

                {/* Maximum Commission */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Commission (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={commissionSettings.maximumCommission}
                    onChange={(e) => setCommissionSettings(prev => ({
                      ...prev,
                      maximumCommission: parseFloat(e.target.value) || 0
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum commission amount in Naira</p>
                </div>

                {/* Payment Structure Info */}
                <div className="md:col-span-2">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Payment Structure</h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• <strong>Platform:</strong> Takes commission percentage from each transaction</li>
                      <li>• <strong>Vendors:</strong> Keep their profit (no commission taken)</li>
                      <li>• <strong>Logistics:</strong> Charge their own fixed fees per delivery</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Preview (₦10,000 transaction)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Platform Commission</p>
                    <p className="font-semibold text-blue-600">{formatCurrency(calculateCommission(10000))}</p>
                    <p className="text-xs text-gray-500">({commissionSettings.platformCommission}% of transaction)</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Vendor Receives</p>
                    <p className="font-semibold text-green-600">{formatCurrency(10000 - calculateCommission(10000))}</p>
                    <p className="text-xs text-gray-500">Transaction amount minus platform commission</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Logistics Fee</p>
                    <p className="font-semibold text-purple-600">Variable</p>
                    <p className="text-xs text-gray-500">Charged separately by logistics partner</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCommissionModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Update Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

