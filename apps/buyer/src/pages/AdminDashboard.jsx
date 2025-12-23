import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import FeaturedProductsManager from '../components/FeaturedProductsManager';

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
  const [allProducts, setAllProducts] = useState([]);
  const [escrowTransactions, setEscrowTransactions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketReply, setTicketReply] = useState('');
  const [showTicketModal, setShowTicketModal] = useState(false);
  
  // Pagination states for users
  const [allUsers, setAllUsers] = useState([]);
  const [usersCursor, setUsersCursor] = useState(null);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  
  // UI states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserRatings, setSelectedUserRatings] = useState([]);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  
  // Form states
  const [rejectionReason, setRejectionReason] = useState('');
  const [disputeResolution, setDisputeResolution] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageRecipients, setMessageRecipients] = useState('all');
  const [messageTitle, setMessageTitle] = useState('');

  // Fetch all admin data
  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      const [usersResult, ordersResult, disputesResult, productsSnapshot, transactionsSnapshot, messagesSnapshot, ticketsSnapshot] = await Promise.all([
        firebaseService.admin.getAllUsers({ pageSize: 50 }),
        firebaseService.admin.getAllOrders({ pageSize: 100 }),
        firebaseService.admin.getAllDisputes({ pageSize: 100 }),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'wallet_transactions')),
        getDocs(collection(db, 'admin_messages')),
        getDocs(collection(db, 'support_tickets'))
      ]);
      
      const usersList = usersResult.items || [];
      const ordersList = ordersResult.items || [];
      const disputesList = disputesResult.items || [];
      const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProducts(productsList);
      
      // Store initial users and pagination info
      setAllUsers(usersList);
      setUsers(usersList);
      setUsersCursor(usersResult.nextCursor);
      setHasMoreUsers(!!usersResult.nextCursor);
      
      setOrders(ordersList);
      setDisputes(disputesList);
      setPendingProducts(productsList.filter(p => p.status === 'pending'));
      setActiveProducts(productsList.filter(p => p.status === 'active'));
      setRejectedProducts(productsList.filter(p => p.status === 'rejected'));
      
      const vendorsList = usersList.filter(user => user.isVendor);
      const logisticsList = usersList.filter(user => user.isLogisticsPartner);
      setVendors(vendorsList);
      setLogistics(logisticsList);
      
      const transactionsList = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEscrowTransactions(transactionsList);
      
      const messagesList = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesList);
      
      const ticketsList = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSupportTickets(ticketsList);
      
      const analyticsData = {
        totalUsers: usersList.length,
        totalVendors: vendorsList.length,
        totalLogistics: logisticsList.length,
        totalRevenue: ordersList.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
        activeOrders: ordersList.filter(order => order.status === 'shipped' || order.status === 'pending').length,
        completedOrders: ordersList.filter(order => order.status === 'completed').length,
        pendingDisputes: disputesList.filter(dispute => dispute.status === 'pending').length,
        pendingProducts: productsList.filter(p => p.status === 'pending').length,
        totalEscrowAmount: transactionsList.reduce((sum, t) => sum + (t.amount || 0), 0),
        totalMessages: messagesList.length
      };
      setAnalytics(analyticsData);
      
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load more users
  const loadMoreUsers = async () => {
    if (!hasMoreUsers || loadingMoreUsers) return;
    
    try {
      setLoadingMoreUsers(true);
      const usersResult = await firebaseService.admin.getAllUsers({ 
        pageSize: 50, 
        cursor: usersCursor 
      });
      
      const newUsers = usersResult.items || [];
      setAllUsers(prev => [...prev, ...newUsers]);
      setUsers(prev => [...prev, ...newUsers]);
      setUsersCursor(usersResult.nextCursor);
      setHasMoreUsers(!!usersResult.nextCursor);
    } catch (error) {
      console.error('Error loading more users:', error);
    } finally {
      setLoadingMoreUsers(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      return;
    }
    fetchAdminData();
  }, [userProfile]);

  // Load ratings for selected user when modal opens
  useEffect(() => {
    const loadUserRatings = async () => {
      if (!showUserModal || !selectedUser) return;
      try {
        setSelectedUserLoading(true);
        const ratingsSnap = await getDocs(
          query(collection(db, 'ratings'), where('rateeId', '==', selectedUser.id))
        );
        const ratings = ratingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSelectedUserRatings(ratings);
      } catch (e) {
        console.error('Error loading user ratings:', e);
      } finally {
        setSelectedUserLoading(false);
      }
    };
    loadUserRatings();
  }, [showUserModal, selectedUser]);
  
  // Filtered users based on search and role filter
  const filteredUsers = useMemo(() => {
    let filtered = allUsers;
    
    // Apply role filter
    if (userRoleFilter === 'vendor') {
      filtered = filtered.filter(u => u.isVendor);
    } else if (userRoleFilter === 'logistics') {
      filtered = filtered.filter(u => u.isLogisticsPartner);
    } else if (userRoleFilter === 'buyer') {
      filtered = filtered.filter(u => !u.isVendor && !u.isLogisticsPartner);
    } else if (userRoleFilter === 'suspended') {
      filtered = filtered.filter(u => u.suspended);
    }
    
    // Apply search filter
    if (userSearchTerm.trim()) {
      const searchLower = userSearchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.displayName?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower) ||
        u.id?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [allUsers, userRoleFilter, userSearchTerm]);

  // ========== COMPREHENSIVE ADMIN FUNCTIONS ==========
  
  // Product Management
  const handleApproveProduct = async (productId) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        status: 'active',
        approvedAt: serverTimestamp(),
        approvedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      });
      await fetchAdminData();
      alert('Product approved successfully!');
    } catch (error) {
      console.error('Error approving product:', error);
      alert('Failed to approve product');
    }
  };

  const handleRejectProduct = async (productId) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        status: 'rejected',
        rejectionReason: rejectionReason,
        rejectedAt: serverTimestamp(),
        rejectedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      });
      setRejectionReason('');
      await fetchAdminData();
      alert('Product rejected successfully!');
    } catch (error) {
      console.error('Error rejecting product:', error);
      alert('Failed to reject product');
    }
  };

  // User Management
  const handleSuspendUser = async (userId, suspended, reason = '') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        suspended: suspended,
        suspensionReason: reason,
        suspendedAt: suspended ? serverTimestamp() : null,
        suspendedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      });
      await fetchAdminData();
      alert(`User ${suspended ? 'suspended' : 'activated'} successfully!`);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', userId));
      await fetchAdminData();
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  // Dispute Resolution
  const handleResolveDispute = async (disputeId, resolution) => {
    try {
      const dispute = disputes.find(d => d.id === disputeId);
      if (!dispute) return;

      await updateDoc(doc(db, 'disputes', disputeId), {
        status: 'resolved',
        resolution: resolution,
        resolvedAt: serverTimestamp(),
        resolvedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      });

      // If resolution is to refund buyer, reverse the escrow
      if (resolution === 'refund_buyer' && dispute.orderId) {
        await updateDoc(doc(db, 'orders', dispute.orderId), {
          status: 'refunded',
          refundedAt: serverTimestamp(),
          refundedBy: currentUser.uid
        });
      }

      await fetchAdminData();
      alert('Dispute resolved successfully!');
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert('Failed to resolve dispute');
    }
  };

  // Escrow Transaction Management
  const handleReverseEscrow = async (transactionId, orderId) => {
    try {
      await updateDoc(doc(db, 'wallet_transactions', transactionId), {
        status: 'reversed',
        reversedAt: serverTimestamp(),
        reversedBy: currentUser.uid
      });

      await updateDoc(doc(db, 'orders', orderId), {
        status: 'refunded',
        refundedAt: serverTimestamp(),
        refundedBy: currentUser.uid
      });

      await fetchAdminData();
      alert('Escrow transaction reversed successfully!');
    } catch (error) {
      console.error('Error reversing escrow:', error);
      alert('Failed to reverse escrow transaction');
    }
  };

  // Support Ticket Management
  const handleReplyToTicket = async (ticketId) => {
    if (!ticketReply.trim()) {
      alert('Please enter a reply message');
      return;
    }

    try {
      await firebaseService.supportTickets.addReply(ticketId, {
        message: ticketReply,
        isAdminReply: true,
        adminId: currentUser.uid,
        adminName: userProfile?.name || 'Admin'
      });

      // Notify user
      const ticket = supportTickets.find(t => t.id === ticketId);
      if (ticket) {
        await firebaseService.notifications.create({
          userId: ticket.userId,
          type: 'support_ticket_reply',
          title: 'Reply to Your Support Ticket',
          message: `Admin has replied to your ticket: ${ticket.subject}`,
          ticketId: ticketId,
          read: false
        });
      }

      setTicketReply('');
      await fetchAdminData();
      alert('Reply sent successfully!');
    } catch (error) {
      console.error('Error replying to ticket:', error);
      alert('Failed to send reply');
    }
  };

  const handleUpdateTicketStatus = async (ticketId, status) => {
    try {
      await firebaseService.supportTickets.updateStatus(ticketId, status, currentUser.uid);
      await fetchAdminData();
      alert('Ticket status updated successfully!');
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('Failed to update ticket status');
    }
  };

  // Messaging System
  const handleSendMessage = async () => {
    try {
      const messageData = {
        title: messageTitle,
        content: messageContent,
        recipients: messageRecipients,
        sentBy: currentUser.uid,
        sentAt: serverTimestamp(),
        type: 'admin_broadcast'
      };

      await addDoc(collection(db, 'admin_messages'), messageData);

      // Create notifications for recipients
      if (messageRecipients === 'all') {
        const allUsers = users;
        for (const user of allUsers) {
          await addDoc(collection(db, 'notifications'), {
            userId: user.id,
            type: 'admin_message',
            title: messageTitle,
            message: messageContent,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      } else if (messageRecipients === 'vendors') {
        const vendorUsers = users.filter(u => u.isVendor);
        for (const user of vendorUsers) {
          await addDoc(collection(db, 'notifications'), {
            userId: user.id,
            type: 'admin_message',
            title: messageTitle,
            message: messageContent,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }

      setMessageTitle('');
      setMessageContent('');
      setMessageRecipients('all');
      setShowBulkMessageModal(false);
      await fetchAdminData();
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  // Analytics and Reporting
  const generateReport = async (reportType) => {
    try {
      let reportData = {};
      
      switch (reportType) {
        case 'users':
          reportData = {
            totalUsers: analytics.totalUsers,
            totalVendors: analytics.totalVendors,
            totalLogistics: analytics.totalLogistics,
            suspendedUsers: users.filter(u => u.suspended).length
          };
          break;
        case 'revenue':
          reportData = {
            totalRevenue: analytics.totalRevenue,
            totalEscrowAmount: analytics.totalEscrowAmount,
            completedOrders: analytics.completedOrders
          };
          break;
        case 'products':
          reportData = {
            pendingProducts: analytics.pendingProducts,
            activeProducts: activeProducts.length,
            rejectedProducts: rejectedProducts.length
          };
          break;
      }
      
      console.log(`${reportType} Report:`, reportData);
      alert(`${reportType} report generated successfully! Check console for details.`);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    }
  };

  // Access control
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
          <p className="mt-2 text-sm text-gray-500">Fetching platform data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-teal-200 mt-2">Comprehensive platform management and control</p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-teal-900/60 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {[
            { id: 'overview', name: 'Overview', icon: '📊' },
            { id: 'users', name: 'Users', icon: '👥' },
            { id: 'orders', name: 'Orders', icon: '📦' },
            { id: 'products', name: 'Products', icon: '🛒' },
            { id: 'featured', name: 'Featured', icon: '⭐' },
            { id: 'disputes', name: 'Disputes', icon: '⚖️' },
            { id: 'escrow', name: 'Escrow', icon: '💰' },
            { id: 'messages', name: 'Messages', icon: '📨' },
            { id: 'support-tickets', name: 'Support Tickets', icon: '🎫' },
            { id: 'analytics', name: 'Analytics', icon: '📈' }
          ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-teal-300/80 hover:text-amber-300 hover:border-teal-700/60'
                }`}
              >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
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

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                onClick={() => setShowBulkMessageModal(true)}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                📨 Send Message to All Users
                    </button>
                    <button
                onClick={() => generateReport('revenue')}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                📊 Generate Revenue Report
                    </button>
                    <button
                onClick={() => setActiveTab('products')}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                🛒 Review Pending Products
                    </button>
                  </div>
                </div>
            </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">User Management</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Showing {filteredUsers.length} of {allUsers.length} users
              {hasMoreUsers && <span className="text-blue-600"> (Load more to see all users)</span>}
            </p>
          </div>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="userSearch" className="block text-sm font-medium text-gray-700 mb-1">
              Search Users
            </label>
            <input
              id="userSearch"
              type="text"
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              placeholder="Search by name, email, or ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Role
            </label>
            <select
              id="roleFilter"
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Users</option>
              <option value="buyer">Buyers Only</option>
              <option value="vendor">Vendors Only</option>
              <option value="logistics">Logistics Only</option>
              <option value="suspended">Suspended Users</option>
            </select>
          </div>
        </div>
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
                        {user.isLogisticsPartner && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Logistics
                      </span>
                    )}
                    {user.suspended && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Suspended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
                  <div className="flex space-x-3">
                <button
                      onClick={() => { setSelectedUser(user); setShowUserModal(true); }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-900"
                    >
                      View
                </button>
                <button
                  onClick={() => handleSuspendUser(user.id, !user.suspended)}
                  className={`text-sm font-medium ${
                    user.suspended 
                      ? 'text-green-600 hover:text-green-900' 
                      : 'text-red-600 hover:text-red-900'
                  }`}
                >
                      {user.suspended ? 'Activate' : 'Suspend'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-900"
                    >
                      Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      {/* Load More Button */}
      {hasMoreUsers && (
        <div className="px-4 py-4 sm:px-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={loadMoreUsers}
            disabled={loadingMoreUsers}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMoreUsers ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Load More Users (50 more)
              </>
            )}
          </button>
        </div>
      )}
      
      {/* No Users Message */}
      {filteredUsers.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p className="text-gray-500">No users found matching your filters.</p>
          {userSearchTerm || userRoleFilter !== 'all' ? (
            <button
              onClick={() => { setUserSearchTerm(''); setUserRoleFilter('all'); }}
              className="mt-2 text-sm text-emerald-600 hover:text-emerald-700"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      )}
    </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">User Details</h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
                <button
                onClick={() => { setShowUserModal(false); setSelectedUser(null); setSelectedUserRatings([]); }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
                </button>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded p-4">
                <h4 className="font-medium text-gray-900 mb-2">Profile</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><span className="text-gray-500">Name:</span> {selectedUser.displayName || '—'}</p>
                  <p><span className="text-gray-500">Role:</span> {selectedUser.role || (selectedUser.isVendor ? 'vendor' : (selectedUser.isLogisticsPartner ? 'logistics' : 'buyer'))}</p>
                  <p><span className="text-gray-500">Status:</span> {selectedUser.suspended ? 'Suspended' : 'Active'}</p>
            </div>
    </div>

              <div className="bg-gray-50 rounded p-4">
                <h4 className="font-medium text-gray-900 mb-2">Recent Activity</h4>
                <div className="text-sm text-gray-700 space-y-1 max-h-40 overflow-auto">
                  {orders.filter(o => o.buyerId === selectedUser.id || o.vendorId === selectedUser.id).slice(0,5).map(o => (
                    <p key={o.id}>Order #{o.id?.slice?.(-6)} • {o.status} • {o.currency ? o.currency.replace(/\d+/, (o.totalAmount || 0).toLocaleString()) : `₦${(o.totalAmount || 0).toLocaleString()}`}</p>
                  ))}
                  {escrowTransactions.filter(t => t.userId === selectedUser.id).slice(0,5).map(t => (
                    <p key={t.id}>Escrow {t.type} • ₦{(t.amount || 0).toLocaleString()} • {t.status}</p>
                  ))}
                  {orders.filter(o => o.buyerId === selectedUser.id || o.vendorId === selectedUser.id).length === 0 && escrowTransactions.filter(t => t.userId === selectedUser.id).length === 0 && (
                    <p className="text-gray-500">No recent activity</p>
                  )}
        </div>
      </div>

              <div className="bg-gray-50 rounded p-4 md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Ratings</h4>
                  {selectedUserLoading && <span className="text-xs text-gray-500">Loading...</span>}
        </div>
                <div className="text-sm text-gray-700 space-y-2 max-h-52 overflow-auto">
                  {selectedUserRatings.length > 0 ? (
                    selectedUserRatings.map(r => (
                      <div key={r.id} className="flex items-start justify-between border rounded p-2">
                        <div>
                          <p className="font-medium">{r.context || 'transaction'}</p>
                          <p className="text-gray-500">By: {r.raterRole || r.raterId?.slice?.(-6)} • {new Date(r.createdAt?.seconds ? r.createdAt.seconds * 1000 : r.createdAt || Date.now()).toLocaleString()}</p>
                          {r.comment && <p className="text-gray-700">{r.comment}</p>}
      </div>
                        <div className="text-yellow-600 font-semibold">{r.stars || r.rating}/5</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No ratings yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Orders</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Monitor and manage all platform orders</p>
      </div>
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
              <li key={order.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order #{order.id?.slice?.(-8)}</p>
                    <p className="text-sm text-gray-500">Buyer: {order.buyerName || order.buyerId}</p>
                    <p className="text-sm text-gray-500">Vendor: {order.vendorName || order.vendorId}</p>
                    <p className="text-sm text-gray-500">Amount: {order.currency ? order.currency.replace(/\d+/, (order.totalAmount || 0).toLocaleString()) : `₦${(order.totalAmount || 0).toLocaleString()}`}</p>
                    <p className="text-sm text-gray-500">Status: {order.status}</p>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href="/enhanced-buyer?tab=orders"
                      className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      title="Open Buyer Dashboard"
                    >
                      View Buyer
                    </a>
                    <a
                      href="/vendor?tab=orders"
                      className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      title="Open Vendor Dashboard"
                    >
                      View Vendor
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Product Filter Tabs */}
          <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
                { id: 'all', name: 'All Products', count: allProducts.length },
                { id: 'pending', name: 'Pending', count: pendingProducts.length },
                { id: 'active', name: 'Active', count: activeProducts.length },
                { id: 'rejected', name: 'Rejected', count: rejectedProducts.length }
              ].map((filter) => (
            <button
                  key={filter.id}
                  onClick={() => setActiveTab(`products-${filter.id}`)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === `products-${filter.id}` || (filter.id === 'all' && activeTab === 'products')
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
                  {filter.name} ({filter.count})
            </button>
          ))}
        </nav>
      </div>

          {/* All Products */}
          {(activeTab === 'products' || activeTab === 'products-all') && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">All Products</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Complete product catalog with approval status</p>
          </div>
          <ul className="divide-y divide-gray-200">
                {allProducts.map((product) => (
                  <li key={product.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img className="h-10 w-10 rounded-lg object-cover" src={product.images[0]} alt={product.name} />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No Image</span>
                  </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {product.currency ? product.currency.replace(/\d+/, product.price?.toLocaleString()) : `₦${product.price?.toLocaleString()}`}
                            </p>
                            <p className="text-sm text-gray-500">Vendor: {product.vendorName || product.vendorId}</p>
                            <p className="text-sm text-gray-500">Category: {product.category}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.status === 'active' ? 'bg-green-100 text-green-800' :
                          product.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          product.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status || 'unknown'}
                  </span>
                        {product.vendorId && (
                          <a
                            href="/vendor?tab=products"
                            className="text-sm font-medium text-blue-600 hover:text-blue-900"
                            title="Open Vendor Dashboard"
                          >
                            View Vendor
                          </a>
                        )}
                        {product.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveProduct(product.id)}
                              className="text-sm font-medium text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowProductModal(true);
                              }}
                              className="text-sm font-medium text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {product.status === 'active' && (
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowProductModal(true);
                            }}
                            className="text-sm font-medium text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        )}
                        {product.status === 'rejected' && (
                          <button
                            onClick={() => handleApproveProduct(product.id)}
                            className="text-sm font-medium text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

          {/* Pending Products */}
          {activeTab === 'products-pending' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Product Approvals</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Review and approve vendor products</p>
              </div>
              <ul className="divide-y divide-gray-200">
                {pendingProducts.map((product) => (
                  <li key={product.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img className="h-10 w-10 rounded-lg object-cover" src={product.images[0]} alt={product.name} />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No Image</span>
                              </div>
                          )}
                        </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {product.currency ? product.currency.replace(/\d+/, product.price?.toLocaleString()) : `₦${product.price?.toLocaleString()}`}
                            </p>
                            <p className="text-sm text-gray-500">Vendor: {product.vendorName || product.vendorId}</p>
                            <p className="text-sm text-gray-500">Category: {product.category}</p>
                        </div>
                      </div>
                    </div>
                      <div className="flex space-x-2">
                        {product.vendorId && (
                          <a
                            href="/vendor?tab=products"
                            className="text-sm font-medium text-blue-600 hover:text-blue-900"
                            title="Open Vendor Dashboard"
                          >
                            View Vendor
                          </a>
                        )}
                        <button
                          onClick={() => handleApproveProduct(product.id)}
                          className="text-sm font-medium text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowProductModal(true);
                          }}
                          className="text-sm font-medium text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                        </div>
                        </div>
                  </li>
                  ))}
              </ul>
                </div>
          )}

          {/* Active Products */}
          {activeTab === 'products-active' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Active Products</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Approved products available for sale</p>
              </div>
              <ul className="divide-y divide-gray-200">
                {activeProducts.map((product) => (
                  <li key={product.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img className="h-10 w-10 rounded-lg object-cover" src={product.images[0]} alt={product.name} />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No Image</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {product.currency ? product.currency.replace(/\d+/, product.price?.toLocaleString()) : `₦${product.price?.toLocaleString()}`}
                            </p>
                            <p className="text-sm text-gray-500">Vendor: {product.vendorName || product.vendorId}</p>
                            <p className="text-sm text-gray-500">Category: {product.category}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {product.vendorId && (
                          <a
                            href="/vendor?tab=products"
                            className="text-sm font-medium text-blue-600 hover:text-blue-900"
                            title="Open Vendor Dashboard"
                          >
                            View Vendor
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowProductModal(true);
                          }}
                          className="text-sm font-medium text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                    </div>
                    </div>
                  </li>
                ))}
              </ul>
        </div>
      )}

          {/* Rejected Products */}
          {activeTab === 'products-rejected' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Rejected Products</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Products that were rejected during review</p>
              </div>
              <ul className="divide-y divide-gray-200">
                {rejectedProducts.map((product) => (
                  <li key={product.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img className="h-10 w-10 rounded-lg object-cover" src={product.images[0]} alt={product.name} />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No Image</span>
                </div>
                            )}
                </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-sm text-gray-500">
                              {product.currency ? product.currency.replace(/\d+/, product.price?.toLocaleString()) : `₦${product.price?.toLocaleString()}`}
                            </p>
                            <p className="text-sm text-gray-500">Vendor: {product.vendorName || product.vendorId}</p>
                            <p className="text-sm text-gray-500">Category: {product.category}</p>
                            {product.rejectionReason && (
                              <p className="text-sm text-red-500">Reason: {product.rejectionReason}</p>
                            )}
                </div>
                </div>
              </div>
                      <div className="flex space-x-2">
                        {product.vendorId && (
                          <a
                            href="/vendor?tab=products"
                            className="text-sm font-medium text-blue-600 hover:text-blue-900"
                            title="Open Vendor Dashboard"
                          >
                            View Vendor
                          </a>
                        )}
                        <button
                          onClick={() => handleApproveProduct(product.id)}
                          className="text-sm font-medium text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
            </div>
                </div>
                  </li>
                ))}
              </ul>
                </div>
          )}
              </div>
      )}

      {/* Featured Products Tab */}
      {activeTab === 'featured' && (
        <FeaturedProductsManager />
      )}

      {/* Disputes Tab */}
      {activeTab === 'disputes' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Dispute Resolution</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage and resolve customer disputes</p>
          </div>
          <ul className="divide-y divide-gray-200">
            {disputes.map((dispute) => (
              <li key={dispute.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-900">Dispute #{dispute.id.slice(-8)}</p>
                    <p className="text-sm text-gray-500">Order: {dispute.orderId}</p>
                    <p className="text-sm text-gray-500">Amount: ₦{dispute.disputedAmount?.toFixed(2) || '0.00'}</p>
                    <p className="text-sm text-gray-500">Reason: {dispute.reason}</p>
                </div>
                  <div className="flex space-x-2">
                  {dispute.orderId && (
                    <a
                      href="/enhanced-buyer?tab=orders"
                      className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      title="Open Buyer Dashboard"
                    >
                      View Buyer
                    </a>
                  )}
                    <button
                      onClick={() => handleResolveDispute(dispute.id, 'refund_buyer')}
                      className="text-sm font-medium text-green-600 hover:text-green-900"
                    >
                      Refund Buyer
                    </button>
                    <button
                      onClick={() => handleResolveDispute(dispute.id, 'favor_vendor')}
                      className="text-sm font-medium text-blue-600 hover:text-blue-900"
                    >
                      Favor Vendor
                    </button>
                </div>
              </div>
              </li>
            ))}
          </ul>
            </div>
      )}

      {/* Escrow Tab */}
      {activeTab === 'escrow' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Escrow Transactions</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Monitor and manage escrow transactions</p>
            </div>
          <ul className="divide-y divide-gray-200">
            {escrowTransactions.map((transaction) => (
              <li key={transaction.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                          <div>
                    <p className="text-sm font-medium text-gray-900">Transaction #{transaction.id.slice(-8)}</p>
                    <p className="text-sm text-gray-500">Amount: ₦{transaction.amount?.toFixed(2) || '0.00'}</p>
                    <p className="text-sm text-gray-500">Type: {transaction.type}</p>
                    <p className="text-sm text-gray-500">Status: {transaction.status}</p>
                          </div>
                  <div className="flex space-x-2">
                  {transaction.orderId && (
                    <a
                      href="/enhanced-buyer?tab=orders"
                      className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      title="Open Buyer Dashboard"
                    >
                      View Buyer
                    </a>
                  )}
                  {transaction.userId && (
                    <a
                      href="/vendor?tab=orders"
                      className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      title="Open Vendor Dashboard"
                    >
                      View Vendor
                    </a>
                  )}
                    {transaction.status === 'completed' && (
                              <button 
                        onClick={() => handleReverseEscrow(transaction.id, transaction.orderId)}
                        className="text-sm font-medium text-red-600 hover:text-red-900"
                              >
                        Reverse
                              </button>
                          )}
                        </div>
                </div>
              </li>
                  ))}
          </ul>
            </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Admin Messages</h3>
            <button
              onClick={() => setShowBulkMessageModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Send Message
            </button>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {messages.map((message) => (
                <li key={message.id} className="px-4 py-4 sm:px-6">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{message.title}</p>
                    <p className="text-sm text-gray-500">{message.content}</p>
                    <p className="text-sm text-gray-500">Recipients: {message.recipients}</p>
                    <p className="text-sm text-gray-500">Sent: {message.sentAt?.toDate?.()?.toLocaleString()}</p>
            </div>
                </li>
              ))}
            </ul>
                  </div>
                  </div>
      )}

      {/* Support Tickets Tab */}
      {activeTab === 'support-tickets' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-white">Support Tickets</h3>
              <p className="text-sm text-teal-200 mt-1">
                {supportTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length} open tickets
              </p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-teal-800/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-teal-800/50">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">Ticket ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-teal-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900 divide-y divide-teal-800/50">
                  {supportTickets.map((ticket) => {
                    const statusColors = {
                      open: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
                      in_progress: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
                      waiting_for_admin: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
                      resolved: 'bg-teal-500/20 text-teal-400 border-teal-500/50',
                      closed: 'bg-slate-700 text-slate-300 border-slate-600'
                    };
                    const priorityColors = {
                      low: 'text-blue-400',
                      medium: 'text-amber-400',
                      high: 'text-orange-400',
                      urgent: 'text-red-400'
                    };
                    return (
                      <tr key={ticket.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-teal-300">
                          {ticket.id.slice(-8)}
                        </td>
                        <td className="px-6 py-4 text-sm text-white">{ticket.subject}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-teal-200">{ticket.userName || ticket.userEmail}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-teal-300 capitalize">{ticket.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${priorityColors[ticket.priority] || priorityColors.medium}`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusColors[ticket.status] || statusColors.open}`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-teal-400">
                          {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowTicketModal(true);
                            }}
                            className="text-emerald-400 hover:text-emerald-300 font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalUsers}</p>
                </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm font-medium text-gray-600">Vendors</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalVendors}</p>
                  </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm font-medium text-gray-600">Logistics Partners</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.totalLogistics}</p>
                  </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm font-medium text-gray-600">Completed Orders</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.completedOrders}</p>
                </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm font-medium text-gray-600">Pending Products</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.pendingProducts}</p>
                  </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm font-medium text-gray-600">Total Escrow Amount</p>
              <p className="text-3xl font-bold text-gray-900">₦{(analytics.totalEscrowAmount || 0).toLocaleString()}</p>
                  </div>
                </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reports</h3>
            <div className="flex flex-wrap gap-3">
                  <button
                onClick={() => generateReport('users')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                👥 User Report
                  </button>
                  <button
                onClick={() => generateReport('revenue')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                💰 Revenue Report
                  </button>
                  <button
                onClick={() => generateReport('products')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                🛒 Products Report
                  </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Message Modal */}
      {showBulkMessageModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Message to Users</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Recipients</label>
                <select
                  value={messageRecipients}
                  onChange={(e) => setMessageRecipients(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Users</option>
                  <option value="vendors">Vendors Only</option>
                  <option value="buyers">Buyers Only</option>
                  <option value="logistics">Logistics Only</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={messageTitle}
                  onChange={(e) => setMessageTitle(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Message title"
                />
                      </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your message content"
                />
                </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowBulkMessageModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Send Message
                </button>
                  </div>
                  </div>
                  </div>
                  </div>
      )}

      {/* Product Rejection Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Product</h3>
              <p className="text-sm text-gray-500 mb-4">Product: {selectedProduct.name}</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Please provide a reason for rejection"
                  />
                </div>
              
              <div className="flex justify-end space-x-2">
                  <button
                  onClick={() => {
                    setShowProductModal(false);
                    setSelectedProduct(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                  </button>
                  <button
                    onClick={() => handleRejectProduct(selectedProduct.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Reject Product
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Ticket Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-slate-900 rounded-xl border border-teal-800/50 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Support Ticket Details</h2>
                <button
                  onClick={() => {
                    setShowTicketModal(false);
                    setSelectedTicket(null);
                    setTicketReply('');
                  }}
                  className="text-teal-300 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-4 text-sm mb-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50">
                      {selectedTicket.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-teal-300 capitalize">{selectedTicket.category}</span>
                    <span className="text-amber-400">{selectedTicket.priority} priority</span>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-4">
                  <p className="text-teal-200 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-teal-300">User: </span>
                    <span className="text-white">{selectedTicket.userName || selectedTicket.userEmail}</span>
                  </div>
                  <div>
                    <span className="text-teal-300">Created: </span>
                    <span className="text-white">
                      {selectedTicket.createdAt?.toDate ? selectedTicket.createdAt.toDate().toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  {selectedTicket.orderId && (
                    <div>
                      <span className="text-teal-300">Order ID: </span>
                      <span className="text-amber-400 font-mono">{selectedTicket.orderId}</span>
                    </div>
                  )}
                </div>

                {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Replies ({selectedTicket.replies.length})</h4>
                    <div className="space-y-4">
                      {selectedTicket.replies.map((reply, index) => (
                        <div key={index} className="bg-slate-800 rounded-lg p-4 border-l-4 border-teal-500">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-teal-300">
                              {reply.isAdminReply ? 'Admin' : selectedTicket.userName}
                            </span>
                            <span className="text-xs text-teal-400">
                              {reply.createdAt?.toDate ? reply.createdAt.toDate().toLocaleString() : 'Recently'}
                            </span>
                          </div>
                          <p className="text-teal-200">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-teal-800/50 pt-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Reply to Ticket</h4>
                  <textarea
                    value={ticketReply}
                    onChange={(e) => setTicketReply(e.target.value)}
                    placeholder="Enter your reply..."
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-teal-700/60 text-teal-50 placeholder-teal-300/60 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none mb-4"
                  />
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleReplyToTicket(selectedTicket.id)}
                      className="px-6 py-2 rounded-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 transition-all"
                    >
                      Send Reply
                    </button>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                      className="px-4 py-2 rounded-lg bg-slate-800 border border-teal-700/60 text-teal-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
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
