import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback, lazy, Suspense, useRef } from 'react';
import useOrderManagement from '../hooks/useOrderManagement';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../contexts/MessagingContext';
import firebaseService from '../services/firebaseService';
import { getVendorDataOptimized } from '../services/optimizedFirebaseService';
import { createSubscriptionRecord } from '../utils/paystack';
import WalletManager from '../components/WalletManager';
import VendorOrdersFilterBar from '../components/VendorOrdersFilterBar';
import secureNotification from '../utils/secureNotification';
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
import PayoutStatusSummary from '../components/PayoutStatusSummary';
// import UnifiedVendorStore from '../components/UnifiedVendorStore'; // Removed - using simple overview instead

// Lazy load heavy components
const VendorAnalyticsDashboard = lazy(() => import('../components/VendorAnalyticsDashboard'));
// const VendorProductManager = lazy(() => import('../components/VendorProductManager'));

// Vendor Messages Tab Component
const planDetails = {
  basic: { price: 0, commission: 5.0, productLimit: 50, analytics: 'basic', support: 'email' },
  pro: { price: 5000, commission: 3.0, productLimit: 500, analytics: 'advanced', support: 'priority' },
  premium: { price: 15000, commission: 2.0, productLimit: -1, analytics: 'premium', support: 'dedicated' }
};

const _formatCurrency = (amount, currency = 'NGN') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
  const symbol = currency?.split?.(' ')?.[0] || '₦';
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

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
  const [senderNames, setSenderNames] = useState({}); // Cache sender names

  useEffect(() => {
    if (activeConversation) {
      markAsRead(activeConversation.id).catch(() => {});
    }
  }, [activeConversation, markAsRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);
  
  // Fetch sender names for all messages
  useEffect(() => {
    if (!messages || messages.length === 0 || !currentUser) return;
    
    const fetchSenderNames = async () => {
      const uniqueSenderIds = [...new Set(messages.map(msg => msg.senderId).filter(Boolean))];
      
      // Use functional update to check current state without including in dependencies
      setSenderNames(prev => {
        const namesToFetch = uniqueSenderIds.filter(id => !prev[id]);
        
        if (namesToFetch.length === 0) return prev;
        
        // Fetch names asynchronously and update state
        (async () => {
          const namePromises = namesToFetch.map(async (senderId) => {
            try {
              const userRef = doc(db, 'users', senderId);
              const snap = await getDoc(userRef);
              if (snap.exists()) {
                const data = snap.data();
                // Get display name - prioritize vendor/business name, then display name, then email
                const displayName = data.vendorProfile?.businessName || 
                                   data.vendorProfile?.storeName ||
                                   data.displayName || 
                                   data.name || 
                                   data.email?.split('@')[0] || 
                                   senderId;
                return { senderId, displayName };
              }
              return { senderId, displayName: senderId };
            } catch (error) {
              console.warn('Error fetching sender name:', error);
              return { senderId, displayName: senderId };
            }
          });
          
          const names = await Promise.all(namePromises);
          setSenderNames(current => {
            const updated = { ...current };
            names.forEach(({ senderId, displayName }) => {
              updated[senderId] = displayName;
            });
            return updated;
          });
        })();
        
        return prev; // Return current state immediately
      });
    };
    
    fetchSenderNames();
  }, [messages, currentUser]);

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
      } catch {
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
                    const senderName = senderNames[senderId] || (mine ? 'You' : 'Unknown');
                    
                    return (
                      <div key={msg.id || `msg-${Math.random()}`} className={`flex flex-col ${mine ? 'items-end' : 'items-start'} mb-3`}>
                        {/* Sender name - only show if not current user */}
                        {!mine && (
                          <div className="mb-1 px-2">
                            <span className="text-xs font-medium text-gray-600">
                              {senderName}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`${
                            mine ? 'bg-emerald-600 text-white' : 'bg-white text-gray-900 border'
                          } px-4 py-2 rounded-2xl max-w-[80%] whitespace-pre-wrap break-words shadow-sm`}
                        >
                          {messageContent}
                            {/* Timestamp */}
                            <div className={`text-xs mt-1 ${mine ? 'text-emerald-100' : 'text-gray-500'}`}>
                              {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              }) : msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              }) : ''}
                            </div>
                          </div>
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
  const { currentUser, userProfile, updateUserProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    sendMessage,
    markAsRead,
    unreadCount,
    loading: messagesLoading,
  } = useMessaging();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      console.log('❌ Vendor: No user, redirecting to login with vendor intent');
      navigate('/login', {
        state: {
          userType: 'vendor',
          message: 'Please sign in or create a vendor account to access the vendor dashboard',
          from: { pathname: '/vendor' }
        }
      });
    }
  }, [currentUser, authLoading, navigate]);

  const [activeTab, setActiveTab] = useState('overview');
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [products, setProducts] = useState([]);
  const [, _setOrdersCursor] = useState(null);
  const [, setProductsCursor] = useState(null);
  const [, _setOrdersCount] = useState(0);
  const [, setProductsCount] = useState(0);
  const [, _setOrdersPages] = useState([]);
  const [, setProductsPages] = useState([]);
  const [, _setOrdersPageIndex] = useState(0);
  const [, setProductsPageIndex] = useState(0);
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
  const [, setDisputesCursor] = useState(null);
  const [, setDisputesPages] = useState([]);
  const [, setDisputesPageIndex] = useState(0);
  const [, _setDisputesCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, product: null });
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [, setDeletingProductId] = useState(null);
  const [upgradeSuccessBanner, setUpgradeSuccessBanner] = useState(null);
  const processingUpgradeRef = useRef(false); // Prevent duplicate upgrade processing

  const { refreshOrders, orders } = useOrderManagement(currentUser?.uid, 'vendor');

  // Load only essential data first for fast initial load
  const fetchInitialData = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Use optimized service for faster loading
      const vendorData = await getVendorDataOptimized(currentUser.uid, 'overview');

      // fallback orders snapshot
      if (Array.isArray(vendorData.orders) && vendorData.orders.length > 0) {
        // No-op for now
      }

    } catch (error) {
      console.error('Error loading initial vendor data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Load tab-specific data only when needed with optimized service
  const loadTabData = useCallback(async (tab) => {
    if (!currentUser) return;

    try {
      switch (tab) {
        case 'orders': {
          // orders handled by useOrderManagement hook
          break;
        }
        case 'products': {
          // Always reload products when products tab is accessed to ensure fresh data
          console.log('📦 Loading products for vendor:', currentUser.uid);
          console.log('📦 Current user email:', currentUser.email);
          
          let productsFound = false;
          
          try {
            // First try non-paged query to get ALL products (not just first page)
            console.log('🔍 Attempt 1: Querying ALL products by vendorId (non-paged):', currentUser.uid);
            const allProducts = await firebaseService.products.getByVendor(currentUser.uid);
            console.log('📦 All products loaded by vendorId:', allProducts.length, 'items');
            if (allProducts.length > 0) {
              console.log('📦 Products data:', allProducts.map(p => ({ id: p.id, name: p.name, vendorId: p.vendorId, vendorEmail: p.vendorEmail, status: p.status })));
              
              // Set all products, but also set up pagination for display
              setProducts(allProducts);
              // Set cursor to null since we have all products, but keep pagination structure for UI
              setProductsCursor(null);
              setProductsPages([{ items: allProducts, cursor: null }]);
              setProductsPageIndex(0);
              productsFound = true;
            }
          } catch (error) {
            console.error('❌ Error loading all products by vendorId:', error);
            
            // Fallback: Try paged query if non-paged fails
            try {
              console.log('🔍 Fallback: Trying paged query by vendorId:', currentUser.uid);
              const productsPage = await firebaseService.products.getByVendorPaged({ vendorId: currentUser.uid, pageSize });
              console.log('📦 Products loaded by vendorId (paged):', productsPage.items.length, 'items');
              if (productsPage.items.length > 0) {
                console.log('📦 Products data:', productsPage.items.map(p => ({ id: p.id, name: p.name, vendorId: p.vendorId, vendorEmail: p.vendorEmail, status: p.status })));
                setProducts(productsPage.items);
                setProductsCursor(productsPage.nextCursor);
                setProductsPages([{ items: productsPage.items, cursor: productsPage.nextCursor }]);
                setProductsPageIndex(0);
                productsFound = true;
              }
            } catch (pagedError) {
              console.error('❌ Paged query also failed:', pagedError);
            }
          }
          
          // If no products found by vendorId, try querying by vendorEmail
          if (!productsFound && currentUser.email) {
            console.log('🔄 Attempt 2: No products found by vendorId, trying vendorEmail query...', currentUser.email);
            try {
              const emailProducts = await firebaseService.products.getByVendorEmail(currentUser.email);
              console.log('📦 Products found by vendorEmail:', emailProducts.length, 'products');
              if (emailProducts.length > 0) {
                console.log('📦 Products data (email):', emailProducts.map(p => ({ id: p.id, name: p.name, vendorId: p.vendorId, vendorEmail: p.vendorEmail, status: p.status })));
                setProducts(emailProducts.slice(0, pageSize));
                setProductsCursor(null);
                setProductsPages([{ items: emailProducts.slice(0, pageSize), cursor: null }]);
                setProductsPageIndex(0);
                productsFound = true;
              }
            } catch (emailError) {
              console.error('⚠️ Query by vendorEmail failed:', emailError);
            }
          }
          
          // Fallback: Try non-paged query by vendorId
          if (!productsFound) {
            console.log('🔄 Attempt 3: Trying non-paged query by vendorId...');
            try {
              const allProducts = await firebaseService.products.getByVendor(currentUser.uid);
              console.log('📦 Fallback query returned:', allProducts.length, 'products');
              if (allProducts.length > 0) {
                setProducts(allProducts);
                setProductsCursor(null);
                setProductsPages([{ items: allProducts, cursor: null }]);
                setProductsPageIndex(0);
                productsFound = true;
              }
            } catch (fallbackError) {
              console.error('❌ Fallback query also failed:', fallbackError);
            }
          }
          
          // Last resort: Try email query again (in case it was a different error)
          if (!productsFound && currentUser.email) {
            console.log('🔄 Attempt 4: Last resort - trying vendorEmail query again...');
            try {
              const emailProducts = await firebaseService.products.getByVendorEmail(currentUser.email);
              console.log('📦 Last resort: Products found by vendorEmail:', emailProducts.length, 'products');
              if (emailProducts.length > 0) {
                setProducts(emailProducts);
                setProductsCursor(null);
                setProductsPages([{ items: emailProducts, cursor: null }]);
                setProductsPageIndex(0);
                productsFound = true;
              }
            } catch (emailError) {
              console.error('❌ Email query also failed:', emailError);
            }
          }
          
          // Ultimate fallback: Fetch ALL products and filter client-side
          if (!productsFound) {
            console.log('🔄 Attempt 5: Ultimate fallback - fetching all products and filtering client-side...');
            try {
              const allProducts = await firebaseService.products.getAll({ showAll: true });
              console.log('📦 Ultimate fallback: Fetched all products:', allProducts.length);
              
              // Filter products by vendorId or vendorEmail
              const filteredProducts = allProducts.filter(product => {
                const matchesVendorId = product.vendorId === currentUser.uid;
                const matchesVendorEmail = product.vendorEmail && 
                                           currentUser.email && 
                                           product.vendorEmail.toLowerCase() === currentUser.email.toLowerCase();
                return matchesVendorId || matchesVendorEmail;
              });
              
              console.log('📦 Ultimate fallback: Filtered products for vendor:', filteredProducts.length);
              console.log('📦 Ultimate fallback: Product details:', filteredProducts.map(p => ({ 
                id: p.id, 
                name: p.name, 
                vendorId: p.vendorId, 
                vendorEmail: p.vendorEmail 
              })));
              
              if (filteredProducts.length > 0) {
                // Sort by createdAt descending
                filteredProducts.sort((a, b) => {
                  const aTime = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
                  const bTime = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
                  if (a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt) {
                    const aDate = a.createdAt.toDate();
                    const bDate = b.createdAt.toDate();
                    return bDate - aDate;
                  }
                  return bTime - aTime;
                });
                
                // Include ALL filtered products (not just first page)
                setProducts(filteredProducts);
                setProductsCursor(null);
                setProductsPages([{ items: filteredProducts, cursor: null }]);
                setProductsPageIndex(0);
                productsFound = true;
                console.log('✅ Ultimate fallback: Successfully loaded', filteredProducts.length, 'products');
              }
            } catch (ultimateError) {
              console.error('❌ Ultimate fallback also failed:', ultimateError);
            }
          }
          
          if (!productsFound) {
            console.error('❌ No products found through any method');
            console.error('🔍 Diagnostic: Current user uid:', currentUser.uid);
            console.error('🔍 Diagnostic: Current user email:', currentUser.email);
            
            // Diagnostic: Query all products to see what vendorIds exist
            try {
              console.log('🔍 Diagnostic: Fetching all products to analyze vendor references...');
              const allProductsSnapshot = await firebaseService.products.getAll({ showAll: true });
              console.log('🔍 Diagnostic: Total products in database:', allProductsSnapshot.length);
              
              // Group products by vendorId and vendorEmail
              const byVendorId = {};
              const byVendorEmail = {};
              
              allProductsSnapshot.forEach(product => {
                const vid = product.vendorId || 'NO_VENDOR_ID';
                const vem = product.vendorEmail || 'NO_VENDOR_EMAIL';
                
                if (!byVendorId[vid]) {
                  byVendorId[vid] = [];
                }
                byVendorId[vid].push(product.id);
                
                if (!byVendorEmail[vem]) {
                  byVendorEmail[vem] = [];
                }
                byVendorEmail[vem].push(product.id);
              });
              
              console.log('🔍 Diagnostic: Products by vendorId:', Object.keys(byVendorId).map(k => `${k}: ${byVendorId[k].length} products`));
              console.log('🔍 Diagnostic: Products by vendorEmail:', Object.keys(byVendorEmail).slice(0, 10).map(k => `${k}: ${byVendorEmail[k].length} products`));
              
              // Check if current user's uid or email matches any products
              const matchingById = byVendorId[currentUser.uid] || [];
              const matchingByEmail = byVendorEmail[currentUser.email?.toLowerCase()] || [];
              
              console.log('🔍 Diagnostic: Products matching current user uid:', matchingById.length);
              console.log('🔍 Diagnostic: Products matching current user email:', matchingByEmail.length);
              
              if (matchingById.length > 0 || matchingByEmail.length > 0) {
                console.warn('⚠️ Products exist but queries failed. This may indicate a query/index issue.');
              }
            } catch (diagError) {
              console.error('🔍 Diagnostic query failed:', diagError);
            }
            
            setProducts([]);
            setProductsCursor(null);
            setProductsPages([]);
            setProductsPageIndex(0);
          }
          break;
        }
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
  }, [currentUser, disputes.length]);

  useEffect(() => {
    if (!currentUser || !activeTab) {
      console.log('⏸️ Tab data loader: Waiting for user or tab...', { currentUser: !!currentUser, activeTab });
      return;
    }

    if (activeTab === 'overview') {
      console.log('📊 Overview tab active: loading products/stats and refreshing orders...');

      (async () => {
        try {
          const [productsData, , statsData] = await Promise.all([
            firebaseService.products.getByVendor(currentUser.uid).catch(err => {
              console.warn('⚠️ Error loading products for overview:', err);
              if (currentUser.email) {
                return firebaseService.products.getByVendorEmail(currentUser.email).catch(() => []);
              }
              return [];
            }),
            getVendorDataOptimized(currentUser.uid, 'orders').catch(err => {
              console.warn('⚠️ Error loading orders for overview:', err);
              return { orders: [] };
            }),
            getVendorDataOptimized(currentUser.uid, 'overview').catch(err => {
              console.warn('⚠️ Error loading stats for overview:', err);
              return { stats: {}, ordersCount: 0, productsCount: 0 };
            })
          ]);

          if (Array.isArray(productsData)) {
            setProducts(productsData);
            setProductsCount(productsData.length);
            console.log('✅ Overview: Loaded', productsData.length, 'products');
          }

          // Replace manual order state with centralized hook refresh
          await refreshOrders();
          console.log('✅ Overview: Orders refreshed via hook');

          if (statsData?.stats) {
            setStats(statsData.stats);
            if (statsData.productsCount !== undefined) setProductsCount(statsData.productsCount);
            console.log('✅ Overview: Stats refreshed');
          }

          console.log('✅ Overview tab: All data loaded successfully');
        } catch (error) {
          console.error('❌ Error loading overview data:', error);
        }
      })();
    } else {
      console.log('📊 Loading data for tab:', activeTab);
      loadTabData(activeTab).catch(err => {
        console.error('Error loading tab data:', err);
      });
    }
  }, [activeTab, currentUser, loadTabData, refreshOrders]);

  // Removed real-time listeners for better performance
  // Data will be refreshed when user switches tabs or manually refreshes

  // Initialize activeTab from URL parameters on mount AND when URL changes
  useEffect(() => {
    const checkUrlAndSetTab = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (tab && ['overview', 'orders', 'store', 'products', 'billing', 'disputes', 'analytics', 'settings', 'wallet', 'messages'].includes(tab)) {
        console.log('📍 Setting activeTab from URL:', tab);
        setActiveTab(tab);
        return true; // Tab was set from URL
      }
      return false; // No tab in URL
    };

    // Check immediately on mount
    checkUrlAndSetTab();

    // Also listen for URL changes (popstate for back/forward, but we'll check on any location change)
    const handleLocationChange = () => {
      checkUrlAndSetTab();
    };
    
    // Check on popstate (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);
    
    // Also check periodically in case URL was updated without triggering popstate
    // This is useful for payment redirects that might happen before React mounts
    const urlCheckInterval = setInterval(() => {
      if (checkUrlAndSetTab()) {
        clearInterval(urlCheckInterval); // Stop checking once we've found and set the tab
      }
    }, 100);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(urlCheckInterval);
    };
  }, []);

  // UPGRADE FLOW: Handle payment redirect and process subscription upgrade
  // This is the MAIN flow that runs on mount and when URL changes
  useEffect(() => {
    // Only run if we have a user
    if (!currentUser) {
      console.log('⏸️ Upgrade flow: No user yet, waiting...');
      return;
    }
    
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const plan = urlParams.get('plan');
      const tab = urlParams.get('tab');
      
    console.log('🔍 Upgrade flow check:', { paymentStatus, plan, tab, url: window.location.href });
    
    // Only process if we have payment=success and a plan
    if (paymentStatus === 'success' && plan) {
      // Prevent duplicate processing
      if (processingUpgradeRef.current) {
        console.log('⏳ Upgrade already processing, skipping...');
        return;
      }
      
      // Check if already upgraded to this plan
      if (userProfile?.subscriptionPlan === plan && userProfile?.subscriptionStatus === 'active') {
        console.log('✅ Already upgraded to', plan, '- just refreshing UI...');
        // Just refresh UI
        setUpgradeSuccessBanner({
          plan: plan.toUpperCase(),
          productLimit: plan === 'pro' ? 500 : plan === 'premium' ? -1 : 50,
          commissionRate: plan === 'pro' ? 3.0 : plan === 'premium' ? 2.0 : 5.0
        });
        // Switch to billing tab if needed
        if (tab === 'billing') {
          setActiveTab('billing');
        }
        // Refresh data
        fetchInitialData().catch(err => console.error('Error refreshing data:', err));
        return;
      }
      
      processingUpgradeRef.current = true;
      
      // Process upgrade immediately
      (async () => {
        try {
          const reference =
            urlParams.get('reference') ||
            urlParams.get('paystack_reference') ||
            urlParams.get('paystack_ref');

          console.log('🚀 UPGRADE FLOW: Starting subscription upgrade for', plan, 'ref:', reference);
          
              const selectedPlan = planDetails[plan] || planDetails.basic;
              
          // STEP 1: Verify payment and create subscription record in backend
          if (reference) {
            try {
              await createSubscriptionRecord({ reference, plan });
              console.log('✅ Paystack subscription record verified');
            } catch (recordError) {
              console.error('❌ Failed to verify subscription with Paystack reference:', recordError);
              throw recordError;
            }
          } else {
            console.warn('⚠️ No Paystack reference found in URL; skipping server verification');
          }

          // STEP 2: Update user profile to reflect new subscription locally
          const profileUpdates = {
            subscriptionPlan: plan,
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date(),
            subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            commissionRate: selectedPlan.commission,
            productLimit: selectedPlan.productLimit,
            analyticsLevel: selectedPlan.analytics,
            supportLevel: selectedPlan.support
          };
          
          console.log('📝 Step 2: Updating user profile...');
          
          // Update context (this also updates Firebase)
          await updateUserProfile(profileUpdates);
          console.log('✅ Profile updated in Firebase and context');
          
          // STEP 3: Show success banner
          setUpgradeSuccessBanner({
            plan: plan.toUpperCase(),
            productLimit: selectedPlan.productLimit,
            commissionRate: selectedPlan.commission
          });
          console.log('✅ Success banner shown');

          // STEP 4: Force complete data refresh
          console.log('🔄 Step 4: Refreshing all data...');

          // Set activeTab to billing to show billing tab
          setActiveTab('billing');

          // Refresh overview data (products, stats)
          await fetchInitialData();
          console.log('✅ Initial data refreshed');

          try {
            const refreshedProducts = await firebaseService.products.getByVendor(currentUser.uid).catch(async (err) => {
              console.warn('Error loading products during upgrade refresh:', err);
              if (currentUser.email) {
                return firebaseService.products.getByVendorEmail(currentUser.email).catch(() => []);
              }
              return [];
            });

            setProducts(refreshedProducts || []);
            setProductsCount(refreshedProducts?.length || 0);
            console.log('✅ Force-refreshed products:', refreshedProducts?.length || 0);
          } catch (refreshErr) {
            console.error('Error force-refreshing products:', refreshErr);
          }

          // Refresh orders via hook for real-time state
          await refreshOrders();
          console.log('✅ Orders refreshed after upgrade via hook');
              
          // Give a moment for context to update
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Refresh billing tab data
          try {
            await loadTabData('billing');
            console.log('✅ Billing tab data refreshed');
          } catch (billingErr) {
            console.warn('Error refreshing billing tab:', billingErr);
              }
              
          // STEP 5: Clean up URL but keep tab parameter
          const cleanUrl = window.location.pathname + '?tab=billing';
          window.history.replaceState({}, '', cleanUrl);
          console.log('✅ URL cleaned:', cleanUrl);
          
          console.log('🎉 UPGRADE FLOW COMPLETE! Plan:', plan);
          
          // Double-check profile is updated - verify upgrade was successful
          console.log('🔍 Verifying profile update:', {
            subscriptionPlan: userProfile?.subscriptionPlan,
            subscriptionStatus: userProfile?.subscriptionStatus,
            productLimit: userProfile?.productLimit,
            commissionRate: userProfile?.commissionRate
          });
              
          // Final verification: Ensure profile actually has the upgrade
          // If not, log a warning (but don't fail - profile update already happened)
          if (userProfile?.subscriptionPlan !== plan) {
            console.warn('⚠️ Profile verification: Plan mismatch detected. Profile may need a moment to sync.');
            console.warn('⚠️ Expected plan:', plan, 'Profile plan:', userProfile?.subscriptionPlan);
              } else {
            console.log('✅ Profile verification: Upgrade confirmed in profile!');
          }
          
          // Final UI refresh to ensure everything is in sync
          // Wait a bit more for context propagation, then do one final refresh
          setTimeout(async () => {
            try {
              console.log('🔄 Final UI sync refresh...');
              await fetchInitialData();
              console.log('✅ Final UI sync complete');
            } catch (syncErr) {
              console.warn('⚠️ Final sync refresh failed (non-critical):', syncErr);
              }
          }, 1000);
          
        } catch (error) {
          console.error('❌ UPGRADE FLOW ERROR:', error);
          
          // Even if there's an error, try to show the banner and refresh UI
          // This ensures user sees SOME feedback even if something fails
          try {
            setUpgradeSuccessBanner({
              plan: plan.toUpperCase(),
              productLimit: planDetails[plan]?.productLimit || 50,
              commissionRate: planDetails[plan]?.commission || 5.0
            });
            setActiveTab('billing');
            
            // Still try to refresh data even on error
            fetchInitialData().catch(err => console.error('Error refreshing after upgrade error:', err));
          } catch (recoveryError) {
            console.error('Error in recovery:', recoveryError);
          }
          
          secureNotification.error('Upgrade processing encountered an error. Your subscription may still have been updated. Please check your billing tab or contact support if you have any concerns. Error: ' + error.message);
        } finally {
          // Reset processing flag after delay
          setTimeout(() => {
            processingUpgradeRef.current = false;
            console.log('🔄 Upgrade processing flag reset - ready for next upgrade');
          }, 3000);
        }
      })();
      
    } else if (paymentStatus === 'cancelled') {
      console.log('Payment cancelled');
            window.history.replaceState({}, '', window.location.pathname);
      processingUpgradeRef.current = false;
          } else {
      processingUpgradeRef.current = false;
        }
  }, [currentUser, userProfile, fetchInitialData, loadTabData, updateUserProfile, refreshOrders]); // Include userProfile to detect updates

  // Check subscription limits before product creation
  const checkProductLimit = async (vendorId) => {
    try {
      // Get current subscription (with fallback to basic plan)
      const subscription = await firebaseService.subscriptions.getByUser(vendorId);
      
      // Define plan limits
      const planLimits = {
        basic: { productLimit: 50 },
        pro: { productLimit: 500 },
        premium: { productLimit: -1 } // unlimited
      };
      
      // Get current plan (default to basic if no subscription)
      const currentPlan = subscription?.plan || 'basic';
      const productLimit = subscription?.productLimit || planLimits[currentPlan]?.productLimit || 50;
      
      // If unlimited, allow
      if (productLimit === -1) {
        return { allowed: true, remaining: -1 };
      }
      
      // Count current products
      const currentProducts = await firebaseService.products.getByVendor(vendorId);
      const productCount = currentProducts.length;
      
      // Check if limit reached
      if (productCount >= productLimit) {
        return {
          allowed: false,
          current: productCount,
          limit: productLimit,
          plan: currentPlan,
          subscription: subscription
        };
      }
      
      return {
        allowed: true,
        current: productCount,
        remaining: productLimit - productCount,
        limit: productLimit,
        plan: currentPlan
      };
    } catch (error) {
      console.error('Error checking product limit:', error);
      // On error, default to basic plan limit
      const currentProducts = await firebaseService.products.getByVendor(vendorId);
      const productCount = currentProducts.length;
      const basicLimit = 50;
      
      if (productCount >= basicLimit) {
        return {
          allowed: false,
          current: productCount,
          limit: basicLimit,
          plan: 'basic',
          error: true
        };
      }
      
      return {
        allowed: true,
        current: productCount,
        remaining: basicLimit - productCount,
        limit: basicLimit,
        plan: 'basic',
        error: true
      };
    }
  };

  const handleAddProduct = async (productData) => {
    try {
      setUploadProgress(0);
      
      // Check product limit before creating
      const limitCheck = await checkProductLimit(currentUser.uid);
      if (!limitCheck.allowed) {
        const limitMessage = `You have reached your product limit of ${limitCheck.limit} products for the ${limitCheck.plan} plan. Please upgrade your subscription to add more products.`;
        secureNotification.warning(limitMessage);
        setUploadProgress(null);
        
        // Optionally redirect to billing tab
        if (limitCheck.plan === 'basic' || limitCheck.plan === 'pro') {
          const shouldUpgrade = confirm(`${limitMessage}\n\nWould you like to upgrade your subscription now?`);
          if (shouldUpgrade) {
            setActiveTab('billing');
          }
        }
        return;
      }
      
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
      secureNotification.error('Failed to add product. Please try again.');
    }
  };

  const filteredOrders = useMemo(() => {
    return (orders || []).filter((order) => {
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

  const ordersList = Array.isArray(filteredOrders) ? filteredOrders : [];

  const formatOrderDate = (order) => {
    const orderDate = order.createdAt?.toDate
      ? order.createdAt.toDate()
      : order.date
        ? new Date(order.date)
        : null;

    if (!orderDate || Number.isNaN(orderDate.getTime())) {
      return {
        formattedDate: 'N/A',
        formattedTime: ''
      };
    }

    return {
      formattedDate: orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      formattedTime: orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const renderStatusPill = (order) => {
    const statusClass =
      order.statusColor ||
      (order.status === 'completed'
        ? 'bg-green-100 text-green-800'
        : order.status === 'escrow_funded'
          ? 'bg-yellow-100 text-yellow-800'
          : order.status === 'shipped'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800');

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
        {order.status}
      </span>
    );
  };

  const renderOrderActions = (order, className = 'flex flex-col gap-2') => (
    <div className={className}>
      <button onClick={() => openOrderDetails(order)} className="text-emerald-600 hover:text-emerald-700 font-medium text-left">
        View Details
      </button>
      {order.status === 'escrow_funded' && (
        <button
          onClick={async () => {
            try {
              await firebaseService.orders.updateStatus(order.id, 'processing', { vendorStartedAt: new Date() });
              await firebaseService.notifications.create({
                userId: order.buyerId,
                type: 'order_processing',
                title: 'Order is Being Processed',
                message: `Your order #${order.id.slice(-8)} is now being processed by the vendor.`,
                orderId: order.id,
                read: false
              });
              await loadTabData('products');
              secureNotification.success('Order moved to Processing');
            } catch (err) {
              console.error('Failed to update order', err);
              secureNotification.error('Failed to update order status');
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
              secureNotification.success('Order ready for shipment');
            } catch (err) {
              console.error('Failed to update order', err);
              secureNotification.error('Failed to update order status');
            }
          }}
          className="text-purple-600 hover:text-purple-700 font-medium text-left"
        >
          Mark Ready
        </button>
      )}
      {order.status === 'ready_for_shipment' && (
        <button onClick={() => openShipModal(order)} className="text-blue-600 hover:text-blue-700 font-medium text-left">
          Ship Order
        </button>
      )}
      {order.status === 'shipped' && (
        <button onClick={() => handleCompleteOrder(order.id)} className="text-green-600 hover:text-green-700 font-medium text-left">
          Complete
        </button>
      )}
      {order.status === 'completed' && (
        <button
          onClick={() =>
            handleCreateDispute(order.id, {
              reason: 'Product not as described',
              description: 'Customer complaint about product quality'
            })
          }
          className="text-red-600 hover:text-red-700 font-medium text-left"
        >
          Dispute
        </button>
      )}
    </div>
  );

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
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('../firebase/config');
        const sendOrderStatusUpdate = httpsCallable(functions, 'sendOrderStatusUpdate');

        await sendOrderStatusUpdate({
          buyerEmail: order.buyerEmail || order.buyer,
          buyerName: order.buyerName || order.buyer,
          orderId: order.id,
          status: 'shipped',
          trackingNumber,
          carrier
        });
      } catch (emailError) {
        console.warn('Failed to send shipping notification:', emailError);
      }

      await refreshOrders();
      setIsShipOpen(false);
      secureNotification.success('Order marked as shipped.');
    } catch (e) {
      console.error('Mark shipped failed', e);
      secureNotification.error('Failed to mark as shipped.');
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      await firebaseService.wallet.releaseWallet(orderId, order.vendorId, order.totalAmount);
      await firebaseService.orders.updateStatus(orderId, 'completed', {
        completedAt: new Date(),
        completedBy: 'vendor'
      });

      await refreshOrders();

      secureNotification.success('Order completed successfully! Funds have been released to your wallet. You can transfer them to your bank account from the Wallet tab.');
    } catch (error) {
      console.error('Error completing order:', error);
      secureNotification.error('Failed to complete order. Please try again.');
    }
  };

  const handleCreateDispute = async (orderId, disputeData) => {
    try {
      const order = orders.find((o) => o.id === orderId);
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

      const disputesPage = await firebaseService.disputes.getByVendorPaged({ vendorId: currentUser.uid, pageSize });
      setDisputes(disputesPage.items);
      setDisputesCursor(disputesPage.nextCursor);
      setDisputesPages([{ items: disputesPage.items, cursor: disputesPage.nextCursor }]);
      setDisputesPageIndex(0);

      await refreshOrders();

      secureNotification.success('Dispute created successfully! Funds have been held pending resolution.');
    } catch (error) {
      console.error('Error creating dispute:', error);
      secureNotification.error('Failed to create dispute. Please try again.');
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
      // Show specific error message for duplicate products
      const errorMessage = e.message?.includes('already exists') 
        ? e.message 
        : 'Failed to save product. Please try again.';
      secureNotification.error(errorMessage);
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
      secureNotification.error('Failed to delete product.');
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
    <div className="min-h-screen bg-slate-950">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-slate-950 border-r border-teal-900/70 shadow-2xl min-h-screen">
          <div className="p-6 border-b border-teal-900/70">
            <Link to="/" className="flex items-center mb-6">
              <div className="w-8 h-8 bg-slate-900 border border-teal-500/60 rounded-lg flex items-center justify-center mr-3">
                <span className="text-amber-300 font-bold text-lg">O</span>
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-teal-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent">
                Ojawa Vendor
              </span>
            </Link>
            
            {/* Dashboard Switcher */}
            <div className="mb-8">
              <DashboardSwitcher />
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-amber-300 uppercase tracking-wider mb-3">VENDOR MENU</p>
              <button 
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'overview'
                    ? 'text-teal-50 bg-teal-900/40 border border-teal-500/40'
                    : 'text-teal-200 hover:text-amber-200 hover:bg-slate-900/70'
                }`}
              >
                📊 Overview
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'orders'
                    ? 'text-teal-50 bg-teal-900/40 border border-teal-500/40'
                    : 'text-teal-200 hover:text-amber-200 hover:bg-slate-900/70'
                }`}
              >
                📦 Orders
              </button>
              <button 
                onClick={() => {
                  console.log('🏪 My Store tab clicked');
                  setActiveTab('store');
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'store'
                    ? 'text-teal-50 bg-teal-900/40 border border-teal-500/40'
                    : 'text-teal-200 hover:text-amber-200 hover:bg-slate-900/70'
                }`}
              >
                🏪 My Store
              </button>
              {/* Logistics tab removed - logistics partners work independently */}
              <button 
                onClick={() => setActiveTab('billing')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'billing'
                    ? 'text-teal-50 bg-teal-900/40 border border-teal-500/40'
                    : 'text-teal-200 hover:text-amber-200 hover:bg-slate-900/70'
                }`}
              >
                💳 Billing & Subscription
              </button>
              <button 
                onClick={() => setActiveTab('disputes')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'disputes'
                    ? 'text-teal-50 bg-teal-900/40 border border-teal-500/40'
                    : 'text-teal-200 hover:text-amber-200 hover:bg-slate-900/70'
                }`}
              >
                ⚖️ Disputes
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'analytics'
                    ? 'text-teal-50 bg-teal-900/40 border border-teal-500/40'
                    : 'text-teal-200 hover:text-amber-200 hover:bg-slate-900/70'
                }`}
              >
                📊 Analytics
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'settings'
                    ? 'text-teal-50 bg-teal-900/40 border border-teal-500/40'
                    : 'text-teal-200 hover:text-amber-200 hover:bg-slate-900/70'
                }`}
              >
                ⚙️ Settings
              </button>
              <button 
                onClick={() => setActiveTab('wallet')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'wallet'
                    ? 'text-teal-50 bg-teal-900/40 border border-teal-500/40'
                    : 'text-teal-200 hover:text-amber-200 hover:bg-slate-900/70'
                }`}
              >
                💳 My Wallet
              </button>
              <button 
                onClick={() => setActiveTab('messages')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg relative ${
                  activeTab === 'messages'
                    ? 'text-teal-50 bg-teal-900/40 border border-teal-500/40'
                    : 'text-teal-200 hover:text-amber-200 hover:bg-slate-900/70'
                }`}
              >
                💬 Messages
                {typeof unreadCount === 'number' && unreadCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-slate-950 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                  activeTab === 'analytics'
                    ? 'text-teal-50 bg-teal-900/40 border border-teal-500/40'
                    : 'text-teal-200 hover:text-amber-200 hover:bg-slate-900/70'
                }`}
              >
                📈 Analytics
              </button>
            </div>
          </div>
          
          {/* Back to Home link removed for cleaner UI */}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 bg-slate-950">
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
              <div className="lg:hidden divide-y border-t">
                {ordersList.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">No orders match the selected filters.</p>
                )}
                {ordersList.map((order) => {
                  const { formattedDate, formattedTime } = formatOrderDate(order);
                  return (
                    <div key={order.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono font-semibold text-gray-900">#{order.id?.slice(-8) || 'N/A'}</p>
                          <p className="text-xs text-gray-500">
                            {formattedDate}
                            {formattedTime ? ` • ${formattedTime}` : ''}
                          </p>
                        </div>
                        {renderStatusPill(order)}
                      </div>
                      <div className="text-sm text-gray-700 space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Buyer</p>
                          <p className="font-medium text-gray-900">{order.buyerName || order.buyer || 'Unknown buyer'}</p>
                          {order.buyerEmail && <p className="text-xs text-gray-500">{order.buyerEmail}</p>}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Items</p>
                          <div className="space-y-1">
                            {(order.items || []).slice(0, 2).map((item, idx) => (
                              <p key={idx} className="text-xs text-gray-600">
                                {item.name} • Qty {item.quantity}
                              </p>
                            ))}
                            {Array.isArray(order.items) && order.items.length > 2 && (
                              <p className="text-xs text-gray-400">+{order.items.length - 2} more</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="font-semibold text-gray-900 text-sm">
                            {order.currency || '₦'}{(order.totalAmount || 0).toLocaleString()}
                          </span>
                          {order.logisticsCompany && <span>🚚 {order.logisticsCompany}</span>}
                          {order.trackingNumber && <span className="font-mono">Tracking: {order.trackingNumber}</span>}
                        </div>

                        <PayoutStatusSummary
                          variant="inline"
                          payoutStatus={order.payoutStatus}
                          payoutRequestId={order.payoutRequestId}
                          payoutTotals={order.payoutTotals}
                          vat={order.vat}
                          currency={order.currency}
                        />
                      </div>
                      <div className="pt-3 border-t">
                        {renderOrderActions(order, 'flex flex-wrap gap-2')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upgrade Success Banner */}
          {upgradeSuccessBanner && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🎉</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      Successfully Upgraded to {upgradeSuccessBanner.plan} Plan!
                    </h3>
                    <p className="text-sm text-green-800 mb-3">
                      Your subscription has been activated. You can now:
                    </p>
                    <ul className="text-sm text-green-700 space-y-1 ml-4">
                      <li>• Add up to {upgradeSuccessBanner.productLimit === -1 ? 'unlimited' : upgradeSuccessBanner.productLimit} products</li>
                      <li>• Pay only {upgradeSuccessBanner.commissionRate}% commission on sales</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => setUpgradeSuccessBanner(null)}
                  className="text-green-600 hover:text-green-800 text-xl"
                >
                  ×
                </button>
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
            <div key="store-tab-content">
              {console.log('🏪 Rendering VendorStoreManager, activeTab:', activeTab)}
              <BulkOperations 
                products={products}
                onProductsUpdate={() => loadTabData('products')}
              />
              <VendorStoreManager 
                key="vendor-store-manager"
                products={products}
                onEditProduct={openEditProduct}
                onDeleteProduct={(product) => setConfirmDelete({ open: true, product })}
                onCreateProduct={openCreateProduct}
                onRefreshProducts={() => loadTabData('products')}
              />
            </div>
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
              
              <div className="hidden lg:block overflow-x-auto">
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
                    {ordersList.map((order) => {
                      const { formattedDate, formattedTime } = formatOrderDate(order);
                      
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
                            {renderStatusPill(order)}
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

                            <PayoutStatusSummary
                              variant="inline"
                              payoutStatus={order.payoutStatus}
                              payoutRequestId={order.payoutRequestId}
                              payoutTotals={order.payoutTotals}
                              vat={order.vat}
                              currency={order.currency}
                            />
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
                            {renderOrderActions(order)}
                          </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="lg:hidden divide-y border-t">
                {ordersList.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">No orders match the selected filters.</p>
                )}
                {ordersList.map((order) => {
                  const { formattedDate, formattedTime } = formatOrderDate(order);
                  return (
                    <div key={order.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono font-semibold text-gray-900">#{order.id?.slice(-8) || 'N/A'}</p>
                          <p className="text-xs text-gray-500">
                            {formattedDate}
                            {formattedTime ? ` • ${formattedTime}` : ''}
                          </p>
                        </div>
                        {renderStatusPill(order)}
                      </div>
                      <div className="text-sm text-gray-700 space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Buyer</p>
                          <p className="font-medium text-gray-900">{order.buyerName || order.buyer || 'Unknown buyer'}</p>
                          {order.buyerEmail && <p className="text-xs text-gray-500">{order.buyerEmail}</p>}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Items</p>
                          <div className="space-y-1">
                            {(order.items || []).slice(0, 2).map((item, idx) => (
                              <p key={idx} className="text-xs text-gray-600">
                                {item.name} • Qty {item.quantity}
                              </p>
                            ))}
                            {Array.isArray(order.items) && order.items.length > 2 && (
                              <p className="text-xs text-gray-400">+{order.items.length - 2} more</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="font-semibold text-gray-900 text-sm">
                            {order.currency || '₦'}{(order.totalAmount || 0).toLocaleString()}
                          </span>
                          {order.logisticsCompany && <span>🚚 {order.logisticsCompany}</span>}
                          {order.trackingNumber && <span className="font-mono">Tracking: {order.trackingNumber}</span>}
                        </div>
                      </div>
                      <div className="pt-3 border-t">
                        {renderOrderActions(order, 'flex flex-wrap gap-2')}
                      </div>
                    </div>
                  );
                })}
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


