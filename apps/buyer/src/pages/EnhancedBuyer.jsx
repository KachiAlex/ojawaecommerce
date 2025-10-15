import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useOrderManagement } from '../hooks/useOrderManagement'
import OrderTimeline from '../components/OrderTimeline'
import { LoadingSpinner, ProductListSkeleton } from '../components/LoadingStates'
import ComponentErrorBoundary from '../components/ComponentErrorBoundary'
import OrderSatisfactionModal from '../components/OrderSatisfactionModal'
import ReviewModal from '../components/ReviewModal'
import ConfirmOrderModal from '../components/ConfirmOrderModal'
import OrderTransactionModal from '../components/OrderTransactionModal'
import DisputeManagement from '../components/DisputeManagement'
import DeliveryTrackingModal from '../components/DeliveryTrackingModal'
import AdvancedDisputeModal from '../components/AdvancedDisputeModal'
import MessagingInterface from '../components/MessagingInterface'
import NotificationPreferences from '../components/NotificationPreferences'
import DashboardSwitcher from '../components/DashboardSwitcher'
import { useMessaging } from '../contexts/MessagingContext'
import { ORDER_STATUS } from '../services/orderWorkflow'
import { errorLogger } from '../utils/errorLogger'
import firebaseService from '../services/firebaseService'
import { openWalletTopUpCheckout } from '../utils/flutterwave'

const EnhancedBuyer = () => {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [walletBalance, setWalletBalance] = useState(0)
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [wallet, setWallet] = useState(null)
  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [isSatisfactionModalOpen, setIsSatisfactionModalOpen] = useState(false)
  const [selectedOrderForSatisfaction, setSelectedOrderForSatisfaction] = useState(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [selectedOrderForTransaction, setSelectedOrderForTransaction] = useState(null)
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false)
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState(null)
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false)
  const [selectedOrderForDispute, setSelectedOrderForDispute] = useState(null)
  const [isMessagingOpen, setIsMessagingOpen] = useState(false)
  const [selectedOrderForMessaging, setSelectedOrderForMessaging] = useState(null)
  const [isConfirmOrderModalOpen, setIsConfirmOrderModalOpen] = useState(false)
  const [selectedOrderForConfirmation, setSelectedOrderForConfirmation] = useState(null)

  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    selectedOrder,
    updating,
    getOrderStats,
    getOrdersByStatus,
    getRecentOrders,
    getOrdersNeedingAction,
    getOrderTimeline,
    getOrderProgress,
    getNextActions,
    updateOrderStatus,
    cancelOrder,
    createDispute,
    setSelectedOrder,
    refreshOrders
  } = useOrderManagement(currentUser?.uid, 'buyer')

  const { unreadCount: messagingUnreadCount } = useMessaging()

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!currentUser) return
      
      try {
        setLoadingWallet(true)
        const walletData = await firebaseService.wallet.getUserWallet(currentUser.uid)
        setWallet(walletData)
        setWalletBalance(walletData?.balance || 0)
      } catch (error) {
        errorLogger.error('Failed to fetch wallet balance', error)
      } finally {
        setLoadingWallet(false)
      }
    }

    fetchWalletBalance()
  }, [currentUser])

  // Handle wallet top-up
  const handleTopUp = async () => {
    if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      const amount = parseFloat(topUpAmount)
      // Launch Flutterwave Checkout
      await openWalletTopUpCheckout({ user: currentUser, amount, currency: wallet?.currency || 'NGN' })
      
      // Refresh wallet data
      const updatedWallet = await firebaseService.wallet.getUserWallet(currentUser.uid)
      setWallet(updatedWallet)
      setWalletBalance(updatedWallet?.balance || 0)
      
      setShowTopUp(false)
      setTopUpAmount('')
    } catch (error) {
      errorLogger.error('Failed to top up wallet', error)
      alert('Failed to top up wallet. Please try again.')
    }
  }

  // Handle order actions
  const handleOrderAction = async (orderId, action, additionalData = {}) => {
    try {
      switch (action) {
        case 'cancel':
          await cancelOrder(orderId, additionalData.reason)
          break
        case 'dispute':
          await createDispute(orderId, additionalData)
          break
        case 'confirm_order':
          await updateOrderStatus(orderId, ORDER_STATUS.COMPLETED, {
            confirmedBy: 'buyer',
            confirmedAt: new Date()
          })
          break
        default:
          await updateOrderStatus(orderId, action, additionalData)
      }
      
      // Show success message
      errorLogger.info(`Order action completed: ${action}`, { orderId, action })
    } catch (error) {
      errorLogger.error('Failed to perform order action', error, { orderId, action })
      alert(`Failed to ${action.replace('_', ' ')} order. Please try again.`)
    }
  }

  // Handle satisfaction confirmation
  const handleReviewSubmit = async (reviewData) => {
    try {
      const { orderId, productRating, vendorRating, reviewText, vendorReviewText, items } = reviewData
      
      // Submit product reviews for each item
      for (const item of items) {
        await firebaseService.reviews.create({
          productId: item.productId,
          orderId,
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Anonymous',
          rating: productRating,
          reviewText,
          verified: true, // Verified purchase
          createdAt: new Date()
        })
      }
      
      // Submit vendor review
      if (selectedOrderForReview?.vendorId) {
        await firebaseService.reviews.create({
          vendorId: selectedOrderForReview.vendorId,
          orderId,
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Anonymous',
          rating: vendorRating,
          reviewText: vendorReviewText,
          verified: true,
          createdAt: new Date()
        })
        
        // Update vendor's average rating
        await updateVendorRating(selectedOrderForReview.vendorId)
      }
      
      errorLogger.info('Review submitted successfully', { orderId, productRating, vendorRating })
      alert('Thank you for your review!')
    } catch (error) {
      errorLogger.error('Failed to submit review', error)
      alert('Failed to submit review. Please try again later.')
    }
  }

  const updateVendorRating = async (vendorId) => {
    try {
      // Calculate average vendor rating from all reviews
      const vendorReviews = await firebaseService.reviews.getByVendor(vendorId)
      if (vendorReviews.length > 0) {
        const avgRating = vendorReviews.reduce((sum, r) => sum + r.rating, 0) / vendorReviews.length
        await firebaseService.users.update(vendorId, {
          'vendorProfile.rating': avgRating,
          'vendorProfile.reviewCount': vendorReviews.length
        })
      }
    } catch (error) {
      console.error('Failed to update vendor rating', error)
    }
  }

  const handleSatisfactionConfirmed = async (satisfactionData) => {
    try {
      if (!selectedOrderForSatisfaction) return

      const { isSatisfied, rating, feedback, createDispute } = satisfactionData
      
      if (isSatisfied) {
        // Release escrow to vendor
        await firebaseService.wallet.releaseWallet(
          selectedOrderForSatisfaction.id,
          selectedOrderForSatisfaction.vendorId,
          selectedOrderForSatisfaction.totalAmount
        )
        
        // Update order status
        await updateOrderStatus(selectedOrderForSatisfaction.id, ORDER_STATUS.COMPLETED, {
          satisfactionConfirmed: true,
          satisfactionRating: rating,
          satisfactionFeedback: feedback,
          confirmedBy: 'buyer',
          confirmedAt: new Date()
        })
        
        // Show success message
        errorLogger.info('Order satisfaction confirmed and escrow released', {
          orderId: selectedOrderForSatisfaction.id,
          rating,
          feedback
        })
      } else if (createDispute) {
        // Create dispute
        await createDispute(selectedOrderForSatisfaction.id, {
          reason: 'buyer_not_satisfied',
          description: feedback,
          rating: rating
        })
      }
      
      // Close satisfaction modal and open review modal
      setIsSatisfactionModalOpen(false)
      
      // Open review modal for satisfied customers
      if (isSatisfied) {
        setSelectedOrderForReview(selectedOrderForSatisfaction)
        setIsReviewModalOpen(true)
      }
      
      setSelectedOrderForSatisfaction(null)
      refreshOrders()
    } catch (error) {
      errorLogger.error('Failed to handle satisfaction confirmation', error)
      alert('Failed to process satisfaction confirmation. Please try again.')
    }
  }

  // Handle modal actions
  const openTransactionModal = (order) => {
    setSelectedOrderForTransaction(order)
    setIsTransactionModalOpen(true)
  }

  const openTrackingModal = (order) => {
    setSelectedOrderForTracking(order)
    setIsTrackingModalOpen(true)
  }

  const openDisputeModal = (order) => {
    setSelectedOrderForDispute(order)
    setIsDisputeModalOpen(true)
  }

  const openMessagingModal = (order) => {
    setSelectedOrderForMessaging(order)
    setIsMessagingOpen(true)
  }

  const openConfirmOrderModal = (order) => {
    setSelectedOrderForConfirmation(order)
    setIsConfirmOrderModalOpen(true)
  }

  const handleOrderConfirmed = (order) => {
    // Refresh orders to show updated status
    refreshOrders()
    // Show success message
    console.log('Order confirmed successfully:', order.id)
  }

  const handleDisputeCreated = () => {
    // Refresh orders after dispute creation
    fetchOrders()
  }

  const openSatisfactionModal = (order) => {
    setSelectedOrderForSatisfaction(order)
    setIsSatisfactionModalOpen(true)
  }

  // Get order stats
  const stats = getOrderStats()
  const recentOrders = getRecentOrders(5)
  const ordersNeedingAction = getOrdersNeedingAction()

  // Status filter options
  const statusFilters = [
    { value: '', label: 'All Orders' },
    { value: ORDER_STATUS.PENDING, label: 'Pending' },
    { value: ORDER_STATUS.PROCESSING, label: 'Processing' },
    { value: ORDER_STATUS.SHIPPED, label: 'Shipped' },
    { value: ORDER_STATUS.DELIVERED, label: 'Delivered' },
    { value: ORDER_STATUS.COMPLETED, label: 'Completed' },
    { value: ORDER_STATUS.CANCELLED, label: 'Cancelled' },
    { value: ORDER_STATUS.DISPUTED, label: 'Disputed' }
  ]

  const [statusFilter, setStatusFilter] = useState('')
  const filteredOrders = statusFilter ? getOrdersByStatus(statusFilter) : orders

  if (ordersLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (ordersError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{ordersError}</p>
          <button
            onClick={refreshOrders}
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <ComponentErrorBoundary componentName="EnhancedBuyer">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Buyer Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage your orders and track your purchases</p>
            </div>
            <DashboardSwitcher />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">📦</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Orders</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">⏳</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pending + stats.processing}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">✅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">💰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Wallet Balance</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loadingWallet ? '...' : `₦${walletBalance.toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Required */}
          {ordersNeedingAction.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-orange-600 text-2xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-orange-800">Action Required</h3>
                  <p className="text-orange-700 mt-1">
                    You have {ordersNeedingAction.length} order{ordersNeedingAction.length !== 1 ? 's' : ''} that need your attention.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Link
                  to="#orders"
                  onClick={() => setActiveTab('orders')}
                  className="text-orange-600 hover:text-orange-500 font-medium"
                >
                  View orders needing action →
                </Link>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'orders', name: 'Orders', icon: '📦' },
                { id: 'wallet', name: 'Wallet', icon: '💰' },
                { id: 'disputes', name: 'Disputes', icon: '⚖️' },
                { id: 'settings', name: 'Settings', icon: '⚙️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Recent Orders */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Orders</h2>
                <div className="bg-white shadow rounded-lg">
                  {recentOrders.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {recentOrders.map((order) => (
                        <div key={order.id} className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-medium text-gray-900">
                                  Order #{order.id.slice(-8)}
                                </h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  order.status === ORDER_STATUS.COMPLETED ? 'bg-green-100 text-green-800' :
                                  order.status === ORDER_STATUS.SHIPPED ? 'bg-blue-100 text-blue-800' :
                                  order.status === ORDER_STATUS.PROCESSING ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === ORDER_STATUS.CANCELLED ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {order.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <p className="text-gray-600">
                                {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''} • 
                                {order.currency ? `${order.currency.split(' ')[0]}${order.totalAmount?.toFixed(2)}` : `₦${order.totalAmount?.toFixed(2)}`} • 
                                {new Date(order.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="text-emerald-600 hover:text-emerald-700 font-medium"
                              >
                                View Details
                              </button>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${getOrderProgress(order)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-4xl mb-4">📦</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                      <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
                      <Link
                        to="/products"
                        className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
                      >
                        Browse Products
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by Status
                    </label>
                    <select
                      id="status-filter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {statusFilters.map((filter) => (
                        <option key={filter.value} value={filter.value}>
                          {filter.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div className="bg-white shadow rounded-lg">
                {filteredOrders.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <div key={order.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-medium text-gray-900">
                                Order #{order.id.slice(-8)}
                              </h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                order.status === ORDER_STATUS.COMPLETED ? 'bg-green-100 text-green-800' :
                                order.status === ORDER_STATUS.SHIPPED ? 'bg-blue-100 text-blue-800' :
                                order.status === ORDER_STATUS.PROCESSING ? 'bg-yellow-100 text-yellow-800' :
                                order.status === ORDER_STATUS.CANCELLED ? 'bg-red-100 text-red-800' :
                                order.status === ORDER_STATUS.DISPUTED ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-500">Total Amount</p>
                                <p className="font-medium">{order.currency ? `${order.currency.split(' ')[0]}${order.totalAmount?.toFixed(2)}` : `₦${order.totalAmount?.toFixed(2)}`}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Order Date</p>
                                <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Items</p>
                                <p className="font-medium">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</p>
                              </div>
                            </div>

                            {/* Order Timeline (Compact) */}
                            <OrderTimeline order={order} compact={true} />
                          </div>
                          
                          <div className="ml-6 flex flex-col gap-2">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium"
                            >
                              View Details
                            </button>
                            
                            {/* Order Actions */}
                            <div className="flex flex-wrap gap-2">
                              {getNextActions(order).map((action) => (
                                <button
                                  key={action.status}
                                  onClick={() => handleOrderAction(order.id, action.action)}
                                  disabled={updating}
                                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm font-medium disabled:opacity-50"
                                >
                                  {action.name}
                                </button>
                              ))}
                              
                              {/* Transaction Details Button */}
                              <button
                                onClick={() => openTransactionModal(order)}
                                className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 text-sm font-medium"
                              >
                                View Transaction
                              </button>
                              
                              {/* Track Delivery Button */}
                              {(order.deliveryOption === 'delivery' || order.trackingId) && (
                                <button
                                  onClick={() => openTrackingModal(order)}
                                  className="bg-purple-100 text-purple-700 px-4 py-2 rounded-md hover:bg-purple-200 text-sm font-medium"
                                >
                                  Track Delivery
                                </button>
                              )}
                              
                              {/* Pickup Available Button */}
                              {order.deliveryOption === 'pickup' && order.status === 'pending_wallet_funding' && (
                                <button
                                  onClick={() => openTrackingModal(order)}
                                  className="bg-orange-100 text-orange-700 px-4 py-2 rounded-md hover:bg-orange-200 text-sm font-medium"
                                >
                                  Product Available for Pickup
                                </button>
                              )}
                              
                              {/* Delivery Confirmation CTA */}
                              {order.status === ORDER_STATUS.DELIVERED && !order.satisfactionConfirmed && (
                                <button
                                  onClick={() => openSatisfactionModal(order)}
                                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium"
                                >
                                  Confirm Order
                                </button>
                              )}
                              
                              {/* Dispute Button */}
                              {order.status !== 'completed' && order.status !== 'cancelled' && (
                                <button
                                  onClick={() => openDisputeModal(order)}
                                  className="bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200 text-sm font-medium"
                                >
                                  Create Dispute
                                </button>
                              )}
                              
                              {/* Message Vendor Button */}
                              <button
                                onClick={() => openMessagingModal(order)}
                                className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md hover:bg-indigo-200 text-sm font-medium"
                              >
                                💬 Message Vendor
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-4xl mb-4">📦</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {statusFilter ? 'No orders found' : 'No orders yet'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                      {statusFilter ? 'Try adjusting your filters' : 'Start shopping to see your orders here'}
                    </p>
                    {!statusFilter && (
                      <Link
                        to="/products"
                        className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
                      >
                        Browse Products
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'disputes' && (
            <DisputeManagement userType="buyer" />
          )}

          {activeTab === 'settings' && (
            <NotificationPreferences />
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Wallet Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Current Balance</h3>
                    <p className="text-3xl font-bold text-emerald-600">
                      ₦{loadingWallet ? '...' : walletBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowTopUp(true)}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
                    >
                      Add Funds
                    </button>
                    <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200">
                      Transaction History
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Order #{selectedOrder.id.slice(-8)}
                  </h3>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Order Timeline (Full) */}
                  <OrderTimeline order={selectedOrder} showDetails={true} />
                  
                  {/* Order Actions */}
                  <div className="border-t pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      {getNextActions(selectedOrder).map((action) => (
                        <button
                          key={action.status}
                          onClick={() => {
                            handleOrderAction(selectedOrder.id, action.action)
                            setSelectedOrder(null)
                          }}
                          disabled={updating}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium disabled:opacity-50"
                        >
                          {action.name}
                        </button>
                      ))}
                      {selectedOrder?.status === ORDER_STATUS.PENDING && (
                        <button
                          onClick={async () => {
                            try {
                              // Direct the user to top-up the exact order amount
                              const amount = selectedOrder.totalAmount || 0
                              window.location.href = `/wallet?topup=${encodeURIComponent(String(amount))}`
                            } catch (e) {
                              errorLogger.error('Failed to start fund-from-order', e)
                            }
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                        >
                          Fund Wallet for this Order
                        </button>
                      )}
                      {(selectedOrder?.status === ORDER_STATUS.ESCROW_FUNDED || 
                        selectedOrder?.status === ORDER_STATUS.SHIPPED || 
                        selectedOrder?.status === ORDER_STATUS.DELIVERED) && 
                        !selectedOrder.satisfactionConfirmed && (
                        <button
                          onClick={() => {
                            openConfirmOrderModal(selectedOrder)
                            setSelectedOrder(null)
                          }}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 text-sm font-medium flex items-center gap-2"
                        >
                          <span>✅</span>
                          <span>Confirm Order</span>
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm font-medium"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Satisfaction Modal */}
        {isSatisfactionModalOpen && selectedOrderForSatisfaction && (
          <OrderSatisfactionModal
            order={selectedOrderForSatisfaction}
            isOpen={isSatisfactionModalOpen}
            onSatisfactionConfirmed={handleSatisfactionConfirmed}
            onClose={() => {
              setIsSatisfactionModalOpen(false)
              setSelectedOrderForSatisfaction(null)
            }}
          />
        )}

        {/* Review Modal */}
        {isReviewModalOpen && selectedOrderForReview && (
          <ReviewModal
            open={isReviewModalOpen}
            order={selectedOrderForReview}
            onSubmit={handleReviewSubmit}
            onClose={() => {
              setIsReviewModalOpen(false)
              setSelectedOrderForReview(null)
            }}
          />
        )}

        {/* Transaction Modal */}
        {isTransactionModalOpen && selectedOrderForTransaction && (
          <OrderTransactionModal
            order={selectedOrderForTransaction}
            isOpen={isTransactionModalOpen}
            onClose={() => {
              setIsTransactionModalOpen(false)
              setSelectedOrderForTransaction(null)
            }}
          />
        )}

        {/* Delivery Tracking Modal */}
        {isTrackingModalOpen && selectedOrderForTracking && (
          <DeliveryTrackingModal
            order={selectedOrderForTracking}
            isOpen={isTrackingModalOpen}
            onClose={() => {
              setIsTrackingModalOpen(false)
              setSelectedOrderForTracking(null)
            }}
          />
        )}

        {/* Advanced Dispute Modal */}
        {isDisputeModalOpen && selectedOrderForDispute && (
          <AdvancedDisputeModal
            order={selectedOrderForDispute}
            isOpen={isDisputeModalOpen}
            onClose={() => {
              setIsDisputeModalOpen(false)
              setSelectedOrderForDispute(null)
            }}
            onDisputeCreated={handleDisputeCreated}
          />
        )}

        {/* Messaging Interface */}
        {isMessagingOpen && selectedOrderForMessaging && (
          <MessagingInterface
            isOpen={isMessagingOpen}
            onClose={() => {
              setIsMessagingOpen(false)
              setSelectedOrderForMessaging(null)
            }}
            order={selectedOrderForMessaging}
            otherUserId={selectedOrderForMessaging.vendorId}
          />
        )}

        {/* Confirm Order Modal */}
        {isConfirmOrderModalOpen && selectedOrderForConfirmation && (
          <ConfirmOrderModal
            order={selectedOrderForConfirmation}
            isOpen={isConfirmOrderModalOpen}
            onOrderConfirmed={handleOrderConfirmed}
            onClose={() => {
              setIsConfirmOrderModalOpen(false)
              setSelectedOrderForConfirmation(null)
            }}
          />
        )}

        {/* Top Up Modal */}
        {showTopUp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Top Up Wallet</h3>
                <button 
                  onClick={() => setShowTopUp(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Add
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">₦</span>
                    <input
                      type="number"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    💡 Funds will be added to your wallet balance after successful payment
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleTopUp}
                    className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700"
                  >
                    Add Funds
                  </button>
                  <button
                    onClick={() => setShowTopUp(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ComponentErrorBoundary>
  )
}

export default EnhancedBuyer