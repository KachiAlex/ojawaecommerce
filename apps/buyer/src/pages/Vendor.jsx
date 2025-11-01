import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../contexts/MessagingContext';
import firebaseService from '../services/firebaseService';
import { getVendorDataOptimized } from '../services/optimizedFirebaseService';
import WalletManager from '../components/WalletManager';
import VendorOrdersFilterBar from '../components/VendorOrdersFilterBar';
import VendorOrderDetailsModal from '../components/VendorOrderDetailsModal';
import ShipOrderModal from '../components/ShipOrderModal';
import ProductEditorModal from '../components/ProductEditorModal';
import VendorProfileModal from '../components/VendorProfileModal';
// LogisticsAssignmentModal removed - logistics partners work independently
import VendorStoreManager from '../components/VendorStoreManager';
import DisputeManagement from '../components/DisputeManagement';
import NotificationPreferences from '../components/NotificationPreferences';
import DashboardSwitcher from '../components/DashboardSwitcher';
import VendorBilling from '../components/VendorBilling';
import BulkOperations from '../components/BulkOperations';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
// import UnifiedVendorStore from '../components/UnifiedVendorStore'; // Removed - using simple overview instead

// Lazy load heavy components
const VendorAnalyticsDashboard = lazy(() => import('../components/VendorAnalyticsDashboard'));
// const VendorProductManager = lazy(() => import('../components/VendorProductManager'));

// Vendor Messages Tab Component
const VendorMessagesTabContent = ({
  currentUser,
  conversations,
  activeConversation,
  setActiveConversation,
  messages,
  sendMessage,
  markAsRead,
  unreadCount,
  loading,
}) => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [otherParticipantName, setOtherParticipantName] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (activeConversation) {
      markAsRead(activeConversation.id).catch(() => {});
    }
  }, [activeConversation, markAsRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !activeConversation || sending) return;
    try {
      setSending(true);
      await sendMessage(activeConversation.id, text);
      setInput('');
    } finally {
      setSending(false);
    }
  };

  const otherParticipantId = useMemo(() => {
    if (!activeConversation || !currentUser) return null;
    const userId = typeof currentUser.uid === 'string' ? currentUser.uid : String(currentUser.uid || '');
    const participant = (activeConversation.participants || []).find((p) => {
      const pId = typeof p === 'string' ? p : String(p || '');
      return pId !== userId;
    });
    return typeof participant === 'string' ? participant : (participant ? String(participant) : null);
  }, [activeConversation, currentUser]);

  useEffect(() => {
    const fetchName = async () => {
      try {
        if (!otherParticipantId) {
          setOtherParticipantName('');
          return;
        }
        const userRef = doc(db, 'users', otherParticipantId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const userName = data.displayName || data.name || data.email || otherParticipantId;
          setOtherParticipantName(userName);
        } else {
          setOtherParticipantName(otherParticipantId);
        }
      } catch (_) {
        setOtherParticipantName(otherParticipantId || '');
      }
    };
    fetchName();
  }, [otherParticipantId]);

  return (
    <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
        <p className="text-gray-600 text-sm mt-1">Chat with buyers and respond to inquiries</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversations list */}
        <div className="w-80 border-r bg-gray-50 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between bg-white">
            <div className="font-semibold text-gray-900">Conversations</div>
            {typeof unreadCount === 'number' && unreadCount > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && (!Array.isArray(conversations) || conversations.length === 0) && (
              <div className="p-4 text-gray-500 text-sm">Loading conversations...</div>
            )}
            {(!Array.isArray(conversations) || conversations.length === 0) && !loading && (
              <div className="p-6 text-center text-gray-500 text-sm">No conversations yet</div>
            )}
            <ul>
              {Array.isArray(conversations) && conversations.map((conv) => {
                if (!conv || typeof conv !== 'object') return null;
                const convId = typeof conv.id === 'string' ? conv.id : String(conv?.id || Math.random());
                return (
                <li key={convId}>
                  <button
                    onClick={() => setActiveConversation(conv)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-100 transition ${
                      activeConversation?.id === convId ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''
                    }`}
                  >
                    <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                      💬
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900 truncate">Conversation</div>
                        {conv.updatedAt && (
                          <div className="text-xs text-gray-500">
                            {new Date(conv.updatedAt.toDate?.() || conv.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {typeof conv.lastMessage?.content === 'string' ? conv.lastMessage.content : 'Tap to start chatting'}
                      </div>
                    </div>
                    {typeof conv.unreadCount === 'number' && conv.unreadCount > 0 && (
                      <span className="ml-2 bg-emerald-600 text-white text-xs rounded-full h-5 px-2 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Chat pane */}
        <div className="flex-1 flex flex-col bg-white">
          {activeConversation ? (
            <>
              <div className="p-4 border-b flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  👤
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Chat</div>
                  {otherParticipantId && (
                    <div className="text-xs text-gray-500">With: {otherParticipantName || otherParticipantId}</div>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {Array.isArray(messages) && messages
                  .slice()
                  .sort((a, b) => {
                    const aSeconds = typeof a?.timestamp?.seconds === 'number' ? a.timestamp.seconds : (typeof a?.timestamp === 'number' ? a.timestamp : 0);
                    const bSeconds = typeof b?.timestamp?.seconds === 'number' ? b.timestamp.seconds : (typeof b?.timestamp === 'number' ? b.timestamp : 0);
                    return aSeconds - bSeconds;
                  })
                  .map((msg) => {
                    if (!msg || typeof msg !== 'object') return null;
                    const senderId = typeof msg.senderId === 'string' ? msg.senderId : String(msg.senderId || '');
                    const userId = typeof currentUser?.uid === 'string' ? currentUser.uid : String(currentUser?.uid || '');
                    const mine = senderId === userId;
                    const messageContent = typeof msg.content === 'string' ? msg.content : String(msg.content || '');
                    return (
                      <div key={msg.id || `msg-${Math.random()}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`${
                            mine ? 'bg-emerald-600 text-white' : 'bg-white text-gray-900 border'
                          } px-4 py-2 rounded-2xl max-w-[80%] whitespace-pre-wrap break-words shadow-sm`}
                        >
                          {messageContent}
                        </div>
                      </div>
                    );
                  })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSend} className="p-4 border-t bg-white">
                <div className="flex items-end gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-6">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Vendor = () => {
  console.log('🏪 Vendor component loaded');
  const { currentUser, userProfile } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    sendMessage,
    markAsRead,
    unreadCount,
    loading: messagesLoading,
    startConversation,
  } = useMessaging?.() || {
    conversations: [],
    activeConversation: null,
    setActiveConversation: () => {},
    messages: [],
    sendMessage: async () => {},
    markAsRead: async () => {},
    unreadCount: 0,
    loading: false,
    startConversation: async () => {},
  };
  
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
  const [filters, setFilters] = useState({ status: '', buyer: '', from: '', to: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isShipOpen, setIsShipOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [disputesCursor, setDisputesCursor] = useState(null);
  const [disputesPages, setDisputesPages] = useState([]);
  const [disputesPageIndex, setDisputesPageIndex] = useState(0);
  const [disputesCount, setDisputesCount] = useState(0);
  const [loadingDisputesNext, setLoadingDisputesNext] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, product: null });
  const [uploadProgress, setUploadProgress] = useState(null);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  // Logistics modal state removed - logistics partners work independently

  // Load only essential data first for fast initial load
  const fetchInitialData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Use optimized service for faster loading
      const vendorData = await getVendorDataOptimized(currentUser.uid, 'overview');
      
      setOrdersCount(vendorData.ordersCount);
      setProductsCount(vendorData.productsCount);
      setStats(vendorData.stats);
      
    } catch (error) {
      console.error('Error loading initial vendor data:', error);
      setStats({ totalSales: 0, activeOrders: 0 });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Load tab-specific data only when needed with optimized service
  const loadTabData = useCallback(async (tab) => {
    if (!currentUser) return;

    try {
      switch (tab) {
        case 'orders':
          if (orders.length === 0) {
            const ordersData = await getVendorDataOptimized(currentUser.uid, 'orders');
            setOrders(ordersData.orders);
            setOrdersCursor(ordersData.lastDoc);
            setOrdersPages([{ items: ordersData.orders, cursor: ordersData.lastDoc }]);
      setOrdersPageIndex(0);
          }
          break;
          
        case 'products':
          // Always reload products when products tab is accessed to ensure fresh data
          console.log('📦 Loading products for vendor:', currentUser.uid);
          console.log('📦 Current user email:', currentUser.email);
          
          try {
            // First try querying by vendorId (currentUser.uid)
            const productsPage = await firebaseService.products.getByVendorPaged({ vendorId: currentUser.uid, pageSize });
            console.log('📦 Products loaded by vendorId:', productsPage.items.length, 'items');
            console.log('📦 Products data:', productsPage.items.map(p => ({ id: p.id, name: p.name, vendorId: p.vendorId, vendorEmail: p.vendorEmail, status: p.status })));
            
            // If no products found by vendorId, try querying by vendorEmail
            if (productsPage.items.length === 0 && currentUser.email) {
              console.log('🔄 No products found by vendorId, trying vendorEmail query...');
              try {
                const emailProducts = await firebaseService.products.getByVendorEmail(currentUser.email);
                console.log('📦 Products found by vendorEmail:', emailProducts.length, 'products');
                if (emailProducts.length > 0) {
                  setProducts(emailProducts.slice(0, pageSize));
                  setProductsCursor(null);
                  setProductsPages([{ items: emailProducts.slice(0, pageSize), cursor: null }]);
                  setProductsPageIndex(0);
                  break;
                }
              } catch (emailError) {
                console.warn('⚠️ Query by vendorEmail failed:', emailError);
              }
            }
            
            setProducts(productsPage.items);
            setProductsCursor(productsPage.nextCursor);
            setProductsPages([{ items: productsPage.items, cursor: productsPage.nextCursor }]);
            setProductsPageIndex(0);
          } catch (error) {
            console.error('❌ Error loading products:', error);
            // Try fallback query without pagination
            try {
              console.log('🔄 Attempting fallback query...');
              const allProducts = await firebaseService.products.getByVendor(currentUser.uid);
              console.log('📦 Fallback query returned:', allProducts.length, 'products');
              
              // If still no products, try by email
              if (allProducts.length === 0 && currentUser.email) {
                console.log('🔄 No products from fallback, trying vendorEmail...');
                const emailProducts = await firebaseService.products.getByVendorEmail(currentUser.email);
                console.log('📦 Products found by vendorEmail (fallback):', emailProducts.length, 'products');
                if (emailProducts.length > 0) {
                  setProducts(emailProducts);
                  setProductsCursor(null);
                  setProductsPages([{ items: emailProducts, cursor: null }]);
                  setProductsPageIndex(0);
                  break;
                }
              }
              
              setProducts(allProducts);
              setProductsCursor(null);
              setProductsPages([{ items: allProducts, cursor: null }]);
              setProductsPageIndex(0);
            } catch (fallbackError) {
              console.error('❌ Fallback query also failed:', fallbackError);
              // Last resort: try email query
              if (currentUser.email) {
                try {
                  const emailProducts = await firebaseService.products.getByVendorEmail(currentUser.email);
                  console.log('📦 Last resort: Products found by vendorEmail:', emailProducts.length, 'products');
                  setProducts(emailProducts);
                  setProductsCursor(null);
                  setProductsPages([{ items: emailProducts, cursor: null }]);
                  setProductsPageIndex(0);
                } catch (emailError) {
                  console.error('❌ Email query also failed:', emailError);
                  setProducts([]);
                }
              } else {
                setProducts([]);
              }
            }
          }
          break;
          
        case 'disputes':
          if (disputes.length === 0) {
            const disputesPage = await firebaseService.disputes.getByVendorPaged({ 
              vendorId: currentUser.uid, 
              pageSize 
            });
      setDisputes(disputesPage.items);
      setDisputesCursor(disputesPage.nextCursor);
      setDisputesPages([{ items: disputesPage.items, cursor: disputesPage.nextCursor }]);
      setDisputesPageIndex(0);
          }
          break;
      }
    } catch (error) {
      console.error(`Error loading ${tab} data:`, error);
    }
  }, [currentUser, orders.length, products.length, disputes.length]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Load tab data when tab changes
  useEffect(() => {
    if (activeTab !== 'overview') {
      loadTabData(activeTab);
    }
  }, [activeTab, loadTabData]);

  // Derived product filters and counts
  const safeProducts = Array.isArray(products) ? products : [];
  const productCountsByStatus = useMemo(() => {
    const counts = { all: safeProducts.length, pending: 0, active: 0, rejected: 0, outofstock: 0, draft: 0 };
    safeProducts.forEach(p => {
      const status = (p.status || '').toLowerCase();
      if (status === 'pending') counts.pending += 1;
      else if (status === 'active') counts.active += 1;
      else if (status === 'rejected') counts.rejected += 1;
      else if (status === 'out of stock') counts.outofstock += 1;
      else if (status === 'draft') counts.draft += 1;
    });
    return counts;
  }, [safeProducts]);

  const displayedProducts = useMemo(() => {
    if (productStatusFilter === 'all') return safeProducts;
    if (productStatusFilter === 'outofstock') return safeProducts.filter(p => (p.status || '').toLowerCase() === 'out of stock');
    return safeProducts.filter(p => (p.status || '').toLowerCase() === productStatusFilter);
  }, [safeProducts, productStatusFilter]);

  // Removed real-time listeners for better performance
  // Data will be refreshed when user switches tabs or manually refreshes

  const handleAddProduct = async (productData) => {
    try {
      setUploadProgress(0);
      // Get vendor's store ID to link product to store
      let storeId = null;
      try {
        const { storeService } = await import('../services/trackingService');
        const vendorStores = await storeService.getStoresByVendor(currentUser.uid);
        if (vendorStores && vendorStores.length > 0) {
          storeId = vendorStores[0].id || vendorStores[0].storeId || null;
          console.log('📦 Linking product to store:', storeId);
        }
      } catch (storeErr) {
        console.warn('Could not fetch store for product:', storeErr);
      }
      
      // Use unified helper that uploads any File items and saves URLs
      await firebaseService.products.saveWithUploadsWithProgress(
        productData,
        currentUser.uid,
        null,
        storeId,
        { onProgress: (p) => setUploadProgress(p) }
      );
      setShowAddProductForm(false);
      setUploadProgress(null);
      // Refresh products
      const productsPage = await firebaseService.products.getByVendorPaged({ vendorId: currentUser.uid, pageSize });
      setProducts(productsPage.items);
      setProductsCursor(productsPage.nextCursor);
    } catch (error) {
      console.error('Error adding product:', error);
      setUploadProgress(null);
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

  // Logistics assignment removed - buyer selects logistics partner during checkout

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

      // Refresh orders
      const refreshedOrders = await firebaseService.orders.getByUserPaged({ userId: currentUser.uid, userType: 'vendor', pageSize });
      setOrders(refreshedOrders.items);
      setOrdersCursor(refreshedOrders.nextCursor);
      
      // Show success message
      alert('Order completed successfully! Funds have been released to your wallet. You can transfer them to your bank account from the Wallet tab.');
    } catch (error) {
      console.error('Error completing order:', error);
      alert('Failed to complete order. Please try again.');
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
      // Get vendor's store ID to link product to store
      let storeId = null;
      try {
        const { storeService } = await import('../services/trackingService');
        const vendorStores = await storeService.getStoresByVendor(currentUser.uid);
        if (vendorStores && vendorStores.length > 0) {
          storeId = vendorStores[0].id || vendorStores[0].storeId || null;
          console.log('📦 Linking product to store:', storeId);
        }
      } catch (storeErr) {
        console.warn('Could not fetch store for product:', storeErr);
      }
      
      if (editingProduct) {
        await firebaseService.products.saveWithUploadsWithProgress(payload, currentUser.uid, (editingProduct?.id || null), storeId, { onProgress: (p) => setUploadProgress(p) });
      } else {
        await firebaseService.products.saveWithUploadsWithProgress(payload, currentUser.uid, null, storeId, { onProgress: (p) => setUploadProgress(p) });
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

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-700">Please sign in to access your vendor dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border p-6">
          <p className="text-gray-700">Loading vendor dashboard…</p>
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
              <DashboardSwitcher />
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
                onClick={() => {
                  console.log('🏪 My Store tab clicked');
                  setActiveTab('store');
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'store' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                🏪 My Store
              </button>
              {/* Logistics tab removed - logistics partners work independently */}
              <button 
                onClick={() => setActiveTab('billing')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'billing' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💳 Billing & Subscription
              </button>
              <button 
                onClick={() => setActiveTab('disputes')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'disputes' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                ⚖️ Disputes
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'analytics' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📊 Analytics
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'settings' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                ⚙️ Settings
              </button>
              <button 
                onClick={() => setActiveTab('wallet')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'wallet' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💳 My Wallet
              </button>
              <button 
                onClick={() => setActiveTab('messages')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg relative ${activeTab === 'messages' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                💬 Messages
                {typeof unreadCount === 'number' && unreadCount > 0 && (
                  <span className="ml-auto bg-emerald-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${activeTab === 'analytics' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                📈 Analytics
              </button>
            </div>
          </div>
          
          {/* Back to Home link removed for cleaner UI */}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Address Update Banner - Shows if vendor has incomplete structured address */}
          {(() => {
            const hasStructuredAddress = userProfile?.vendorProfile?.structuredAddress;
            const hasCity = hasStructuredAddress?.city;
            const hasState = hasStructuredAddress?.state;
            const shouldShowBanner = !hasCity || !hasState || !hasStructuredAddress;
            
            console.log('🔍 Address Banner Debug:', {
              hasStructuredAddress: !!hasStructuredAddress,
              hasCity: !!hasCity,
              hasState: !!hasState,
              shouldShowBanner,
              structuredAddress: hasStructuredAddress,
              businessAddress: userProfile?.vendorProfile?.businessAddress
            });
            
            return shouldShowBanner;
          })() && (
            <div className="mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-l-4 border-orange-500 rounded-lg p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">
                    Update Your Business Address
                  </h3>
                  <p className="text-sm text-orange-800 mb-3">
                    Your business address is incomplete or not in the new structured format. This is required for:
                  </p>
                  <ul className="text-sm text-orange-700 space-y-1 mb-4 ml-4">
                    <li>• <strong>Accurate delivery cost calculation</strong> for customer orders</li>
                    <li>• <strong>Logistics partner matching</strong> for your delivery area</li>
                    <li>• <strong>Better customer experience</strong> with reliable shipping estimates</li>
                    <li>• <strong>Higher trust</strong> from buyers seeing complete business info</li>
                  </ul>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsProfileModalOpen(true)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                    >
                      Update Address Now
                    </button>
                    <span className="text-xs text-orange-600">
                      Takes less than 2 minutes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Product Modal */}
          <ProductEditorModal
            open={showAddProductForm}
            product={null}
            onClose={() => setShowAddProductForm(false)}
            onSave={handleAddProduct}
            progress={uploadProgress}
          />

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="p-8">
              {/* Welcome Section */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {currentUser?.displayName || 'Vendor'}!
                </h1>
                <p className="text-gray-600">Here's your business dashboard overview.</p>
              </div>

              {/* Business Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Products</p>
                      <p className="text-3xl font-bold">{products.length}</p>
                    </div>
                    <div className="text-4xl opacity-80">📦</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Total Orders</p>
                      <p className="text-3xl font-bold">{orders.length}</p>
                    </div>
                    <div className="text-4xl opacity-80">📋</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm font-medium">Pending Orders</p>
                      <p className="text-3xl font-bold">
                        {orders.filter(order => order.status === 'pending').length}
                      </p>
                    </div>
                    <div className="text-4xl opacity-80">⏳</div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Total Revenue</p>
                      <p className="text-3xl font-bold">
                        ₦{orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-4xl opacity-80">💰</div>
                    </div>
                  </div>
                </div>
                
              {/* Business Overview Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Store Information */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-2xl mr-3">🏪</span>
                    Store Information
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Store Name</span>
                      <span className="font-medium">{userProfile?.vendorProfile?.storeName || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Business Type</span>
                      <span className="font-medium capitalize">{userProfile?.vendorProfile?.businessType || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Verification Status</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        userProfile?.vendorProfile?.verificationStatus === 'verified' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {userProfile?.vendorProfile?.verificationStatus || 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Member Since</span>
                      <span className="font-medium">
                        {userProfile?.createdAt ? (
                          typeof userProfile.createdAt === 'object' && userProfile.createdAt.seconds
                            ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString()
                            : typeof userProfile.createdAt === 'string'
                            ? new Date(userProfile.createdAt).toLocaleDateString()
                            : 'N/A'
                        ) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-2xl mr-3">⚡</span>
                    Quick Actions
                  </h2>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('store')}
                      className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left flex items-center"
                    >
                      <span className="text-2xl mr-3">🏪</span>
                      <div>
                        <p className="font-medium text-gray-900">Manage Store</p>
                        <p className="text-sm text-gray-600">Add products and manage your store</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('orders')}
                      className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left flex items-center"
                    >
                      <span className="text-2xl mr-3">📦</span>
                      <div>
                        <p className="font-medium text-gray-900">View Orders</p>
                        <p className="text-sm text-gray-600">Track and manage your orders</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('analytics')}
                      className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left flex items-center"
                    >
                      <span className="text-2xl mr-3">📊</span>
                      <div>
                        <p className="font-medium text-gray-900">Analytics</p>
                        <p className="text-sm text-gray-600">View your business insights</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="text-2xl mr-3">📋</span>
                  Recent Orders
                </h2>
                
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order, index) => (
                      <div key={order.id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                            <span className="text-blue-600 font-bold">#{order.id?.slice(-4) || index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              Order #{order.id?.slice(-6) || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {order.buyerName || 'Customer'} • {order.items?.length || 0} items
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">₦{order.totalAmount?.toLocaleString() || '0'}</p>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📦</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-gray-600 mb-4">Start by adding products to your store</p>
                    <button
                      onClick={() => setActiveTab('store')}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Products
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'store' && (
            <>
              {console.log('🏪 Rendering VendorStoreManager, activeTab:', activeTab)}
              <BulkOperations 
                products={products}
                onProductsUpdate={() => loadTabData('products')}
              />
              <VendorStoreManager 
                products={products}
                onEditProduct={openEditProduct}
                onDeleteProduct={(product) => setConfirmDelete({ open: true, product })}
                onCreateProduct={openCreateProduct}
                onRefreshProducts={() => loadTabData('products')}
              />
            </>
          )}

          {activeTab === 'products' && Array.isArray(products) && (
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

              {/* Vendor Profile Section */}
              <div className="bg-white rounded-xl border mb-8">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Store Profile</h2>
                    <button
                      onClick={() => setIsProfileModalOpen(true)}
                      className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                    >
                      Update Profile
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Store Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Store Name:</span>
                          <span className="text-sm font-medium">{userProfile?.vendorProfile?.storeName || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Business Address:</span>
                          <span className="text-sm font-medium">{userProfile?.vendorProfile?.businessAddress || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Business Phone:</span>
                          <span className="text-sm font-medium">{userProfile?.vendorProfile?.businessPhone || 'Not set'}</span>
                        </div>
                        {userProfile?.vendorProfile?.website && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Website:</span>
                            <a 
                              href={userProfile.vendorProfile.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              {userProfile.vendorProfile.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Verification Status</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Vendor Status:</span>
                          <span className={`text-sm font-medium ${
                            userProfile?.vendorProfile?.verificationStatus === 'verified' 
                              ? 'text-green-600' 
                              : userProfile?.vendorProfile?.verificationStatus === 'pending'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}>
                            {userProfile?.vendorProfile?.verificationStatus || 'Not verified'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Address Verification:</span>
                          <span className={`text-sm font-medium ${
                            userProfile?.vendorProfile?.addressVerificationStatus === 'verified' 
                              ? 'text-green-600' 
                              : userProfile?.vendorProfile?.addressVerificationStatus === 'pending'
                              ? 'text-yellow-600'
                              : 'text-gray-600'
                          }`}>
                            {userProfile?.vendorProfile?.addressVerificationStatus || 'Not submitted'}
                          </span>
                        </div>
                        {userProfile?.vendorProfile?.storeSlug && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Store Link:</span>
                            <a 
                              href={`/store/${userProfile.vendorProfile.storeSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              View Store
                            </a>
                          </div>
                        )}
                      </div>
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
                        onClick={() => setActiveTab('wallet')}
                        className="w-full border border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        View Wallet
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
            </div>
          )}

          {activeTab === 'orders' && Array.isArray(orders) && (
            <div className="bg-white rounded-xl border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Order Management</h2>
                  <VendorOrdersFilterBar onChange={setFilters} />
                </div>
              </div>

              {/* Logistics Info Banner */}
              <div className="mx-6 mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl">📦</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">About Logistics & Delivery</h4>
                    <p className="text-sm text-blue-700">
                      Buyers select their preferred logistics partner during checkout. Once you mark an order as "Ready for Shipment", 
                      the selected logistics company will be notified automatically to pick up the package. You can view the logistics 
                      partner in each order's details.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking & Wallet</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(Array.isArray(filteredOrders) ? filteredOrders : []).map((order) => {
                      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : (order.date ? new Date(order.date) : new Date());
                      const formattedDate = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const formattedTime = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                      <tr key={order.id} className="hover:bg-gray-50">
                          {/* Order ID */}
                          <td className="px-6 py-4 text-sm">
                            <div className="space-y-1">
                              <p className="font-mono font-medium text-gray-900">#{order.id?.slice(-8) || 'N/A'}</p>
                              {order.trackingId && (
                                <p className="text-xs text-blue-600 font-mono">{order.trackingId}</p>
                              )}
                          </div>
                        </td>
                          
                          {/* Items List */}
                          <td className="px-6 py-4 text-sm">
                            <div className="space-y-1 max-w-xs">
                              {Array.isArray(order.items) ? (
                                order.items.map((item, idx) => (
                                  <div key={idx} className="text-xs">
                                    <p className="font-medium text-gray-900">{item.name}</p>
                                    <p className="text-gray-500">Qty: {item.quantity} × ₦{item.price?.toLocaleString()}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-900">{order.item || 'N/A'}</p>
                              )}
                            </div>
                          </td>
                          
                          {/* Buyer Details */}
                          <td className="px-6 py-4 text-sm">
                            <div className="space-y-1">
                              <p className="font-medium text-gray-900">{order.buyerName || order.buyer || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{order.buyerEmail || 'No email'}</p>
                              {order.buyerPhone && (
                                <p className="text-xs text-gray-500">{order.buyerPhone}</p>
                              )}
                              <p className="text-xs text-blue-600 font-mono">ID: {order.buyerId?.slice(-6) || 'N/A'}</p>
                            </div>
                          </td>
                          
                          {/* Status */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                order.statusColor || 
                                (order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                 order.status === 'escrow_funded' ? 'bg-yellow-100 text-yellow-800' :
                                 order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                 'bg-gray-100 text-gray-800')
                              }`}>
                            {order.status}
                          </span>
                              {order.paymentStatus && (
                                <p className="text-xs text-gray-500">Pay: {order.paymentStatus}</p>
                              )}
                            </div>
                        </td>
                          
                          {/* Amount Details */}
                          <td className="px-6 py-4 text-sm">
                            <div className="space-y-1">
                              <p className="font-semibold text-gray-900">
                                {order.currency || '₦'}{(order.totalAmount || 0).toLocaleString()}
                              </p>
                              {order.subtotal && (
                                <p className="text-xs text-gray-500">Subtotal: ₦{order.subtotal.toLocaleString()}</p>
                              )}
                              {order.deliveryFee && (
                                <p className="text-xs text-gray-500">Delivery: ₦{order.deliveryFee.toLocaleString()}</p>
                              )}
                              {order.escrowAmount && (
                                <p className="text-xs text-yellow-600">Escrow: ₦{order.escrowAmount.toLocaleString()}</p>
                              )}
                            </div>
                          </td>
                          
                          {/* Date */}
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="space-y-1">
                              <p className="font-medium">{formattedDate}</p>
                              <p className="text-xs">{formattedTime}</p>
                            </div>
                          </td>
                          
                          {/* Tracking & Wallet Info */}
                          <td className="px-6 py-4 text-sm">
                            <div className="space-y-1">
                              {order.trackingNumber && (
                                <div>
                                  <p className="text-xs text-gray-500">Tracking:</p>
                                  <p className="font-mono text-xs text-gray-900">{order.trackingNumber}</p>
                                </div>
                              )}
                              {order.logisticsCompany && (
                                <p className="text-xs text-gray-500">🚚 {order.logisticsCompany}</p>
                              )}
                              {order.walletId && (
                                <div>
                                  <p className="text-xs text-gray-500">Wallet:</p>
                                  <p className="font-mono text-xs text-purple-600">{order.walletId}</p>
                                </div>
                              )}
                              {!order.walletId && <p className="text-xs text-gray-400">No wallet ID</p>}
                            </div>
                          </td>
                          
                          {/* Actions */}
                          <td className="px-6 py-4 text-sm">
                            <div className="flex flex-col gap-2">
                              <button onClick={() => openOrderDetails(order)} className="text-emerald-600 hover:text-emerald-700 font-medium text-left">View Details</button>
                            {order.status === 'escrow_funded' && (
                              <button 
                                onClick={async () => {
                                  try {
                                    await firebaseService.orders.updateStatus(order.id, 'processing', { vendorStartedAt: new Date() });
                                    // Notify buyer
                                    await firebaseService.notifications.create({
                                      userId: order.buyerId,
                                      type: 'order_processing',
                                      title: 'Order is Being Processed',
                                      message: `Your order #${order.id.slice(-8)} is now being processed by the vendor.`,
                                      orderId: order.id,
                                      read: false
                                    });
                                    await loadTabData('products');
                                    alert('Order moved to Processing');
                                  } catch (err) {
                                    console.error('Failed to update order', err);
                                    alert('Failed to update order status');
                                  }
                                }}
                                  className="text-blue-600 hover:text-blue-700 font-medium text-left"
                              >
                                Start Processing
                              </button>
                            )}
                            {order.status === 'processing' && (
                              <button 
                                onClick={async () => {
                                  try {
                                    await firebaseService.orders.updateStatus(order.id, 'ready_for_shipment', { readyForShipmentAt: new Date() });
                                    // Notify buyer and logistics
                                    await firebaseService.notifications.create({
                                      userId: order.buyerId,
                                      type: 'order_ready',
                                      title: 'Order Ready for Shipment',
                                      message: `Your order #${order.id.slice(-8)} is ready for pickup by logistics.`,
                                      orderId: order.id,
                                      read: false
                                    });
                                    if (order.logisticsCompanyId) {
                                      await firebaseService.notifications.create({
                                        userId: order.logisticsCompanyId,
                                        type: 'pickup_required',
                                        title: 'Pickup Required',
                                        message: `Order #${order.id.slice(-8)} is ready for pickup from vendor.`,
                                        orderId: order.id,
                                        read: false
                                      });
                                    }
                                    await loadTabData('products');
                                    alert('Order ready for shipment');
                                  } catch (err) {
                                    console.error('Failed to update order', err);
                                    alert('Failed to update order status');
                                  }
                                }}
                                  className="text-purple-600 hover:text-purple-700 font-medium text-left"
                              >
                                Mark Ready
                              </button>
                            )}
                            {order.status === 'ready_for_shipment' && (
                                <button onClick={() => openShipModal(order)} className="text-blue-600 hover:text-blue-700 font-medium text-left">Ship Order</button>
                            )}
                            {order.status === 'shipped' && (
                              <button 
                                onClick={() => handleCompleteOrder(order.id)} 
                                  className="text-green-600 hover:text-green-700 font-medium text-left"
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
                                  className="text-red-600 hover:text-red-700 font-medium text-left"
                              >
                                Dispute
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
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

          {activeTab === 'store' && (
            <>
              {console.log('🏪 Rendering VendorStoreManager, activeTab:', activeTab)}
            <VendorStoreManager 
              products={products}
              onEditProduct={openEditProduct}
              onDeleteProduct={(product) => setConfirmDelete({ open: true, product })}
              onCreateProduct={openCreateProduct}
                onRefreshProducts={() => loadTabData('products')}
            />
            </>
          )}

          {activeTab === 'products' && Array.isArray(products) && (
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
                      <div className="flex flex-wrap gap-2 text-sm">
                        {[
                          {key:'all', label: `All (${productCountsByStatus.all})`},
                          {key:'pending', label: `Pending (${productCountsByStatus.pending})`},
                          {key:'active', label: `Active (${productCountsByStatus.active})`},
                          {key:'rejected', label: `Rejected (${productCountsByStatus.rejected})`},
                          {key:'outofstock', label: `Out of Stock (${productCountsByStatus.outofstock})`},
                          {key:'draft', label: `Draft (${productCountsByStatus.draft})`},
                        ].map(t => (
                          <button
                            key={t.key}
                            onClick={() => setProductStatusFilter(t.key)}
                            className={`px-3 py-1 rounded-lg border ${productStatusFilter===t.key ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-gray-700 hover:bg-gray-50'}`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
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
                      {(Array.isArray(displayedProducts) ? displayedProducts : []).map((product) => (
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
                                (product.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
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
                                <option value="pending">Pending (Awaiting Approval)</option>
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
                              <button 
                                onClick={() => {
                                  const productLink = `${window.location.origin}/products/${product.id}`;
                                  navigator.clipboard.writeText(productLink);
                                  alert('Product link copied to clipboard!');
                                }}
                                className="text-blue-600 hover:text-blue-700 font-medium" 
                                title="Copy product link"
                              >
                                Share
                              </button>
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
                  {/* Rejection reason helper */}
                  <div className="px-6 pb-4">
                    {products.some(p => (p.status || '').toLowerCase() === 'rejected' && p.rejectionReason) && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-800 font-medium mb-1">Some products were rejected.</p>
                        <p className="text-sm text-red-700">Open the product to see the rejection reason, fix the issues, and click Edit to resubmit.</p>
                      </div>
                    )}
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

          {/* Logistics tab removed - logistics partners work independently */}
          {false && activeTab === 'logistics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Logistics Management</h2>
                <div className="flex gap-3">
                  <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                    Add Logistics Partner
                  </button>
                </div>
              </div>

              {/* Logistics Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Partners</p>
                      <p className="text-2xl font-bold text-gray-900">3</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xl">🚚</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Deliveries This Month</p>
                      <p className="text-2xl font-bold text-gray-900">47</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-xl">📦</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Delivery Time</p>
                      <p className="text-2xl font-bold text-gray-900">2.3 days</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <span className="text-yellow-600 text-xl">⏱️</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-gray-900">98.5%</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-xl">📈</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logistics Partners Table */}
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Logistics Partners</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Areas</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-lg">🚚</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">Swift Logistics</div>
                              <div className="text-sm text-gray-500">swift@logistics.com</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Lagos, Abuja, Kano</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1-2 days</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-yellow-400">⭐</span>
                            <span className="text-sm font-medium ml-1">4.8</span>
                            <span className="text-sm text-gray-500 ml-1">(123)</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button className="text-emerald-600 hover:text-emerald-700 font-medium">View</button>
                            <button className="text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                            <button className="text-gray-600 hover:text-gray-700 font-medium">Disable</button>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-lg">⚡</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">Express Delivery</div>
                              <div className="text-sm text-gray-500">express@delivery.com</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Lagos, Port Harcourt</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Same day</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-yellow-400">⭐</span>
                            <span className="text-sm font-medium ml-1">4.6</span>
                            <span className="text-sm text-gray-500 ml-1">(89)</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button className="text-emerald-600 hover:text-emerald-700 font-medium">View</button>
                            <button className="text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                            <button className="text-gray-600 hover:text-gray-700 font-medium">Disable</button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Deliveries */}
              <div className="bg-white rounded-xl border">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Deliveries</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600">🚚</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Order #ORD-001 → Lagos, Nigeria</p>
                        <p className="text-sm text-gray-600">Swift Logistics • In Transit • Est. 1 day</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">₦5,000</p>
                        <p className="text-xs text-gray-500">Delivery fee</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600">✅</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Order #ORD-002 → Abuja, Nigeria</p>
                        <p className="text-sm text-gray-600">Express Delivery • Delivered • 2 days ago</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">₦6,500</p>
                        <p className="text-xs text-gray-500">Delivery fee</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <NotificationPreferences />
          )}

          {activeTab === 'billing' && (
            <VendorBilling />
          )}

          {activeTab === 'analytics' && (
            <VendorAnalyticsDashboard />
          )}

          {activeTab === 'disputes' && (
            <DisputeManagement userType="vendor" />
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

          {activeTab === 'messages' && (
            <VendorMessagesTabContent
              currentUser={currentUser}
              conversations={conversations}
              activeConversation={activeConversation}
              setActiveConversation={setActiveConversation}
              messages={messages}
              sendMessage={sendMessage}
              markAsRead={markAsRead}
              unreadCount={unreadCount}
              loading={messagesLoading}
            />
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

      {/* Vendor Profile Modal */}
      <VendorProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdate={(updatedProfile) => {
          // Profile updated successfully
          console.log('Profile updated:', updatedProfile);
        }}
      />

      {/* Logistics Assignment Modal removed - logistics partners work independently */}
    </div>
  );
};

export default Vendor;


