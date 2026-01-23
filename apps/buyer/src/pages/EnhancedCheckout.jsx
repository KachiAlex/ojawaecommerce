import { useState, useEffect } from 'react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import LogisticsSelector from '../components/LogisticsSelector'
import PaymentRetryModal from '../components/PaymentRetryModal'
import { LoadingSpinner } from '../components/LoadingStates'
import ComponentErrorBoundary from '../components/ComponentErrorBoundary'
import { paymentService, PAYMENT_STATUS, PAYMENT_ERROR_TYPES } from '../services/paymentService'
import { ORDER_STATUS } from '../services/orderWorkflow'
import firebaseService from '../services/firebaseService'
import { errorLogger } from '../utils/errorLogger'

const EnhancedCheckoutForm = ({ total, cartItems, onSuccess, orderDetails }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [paymentId, setPaymentId] = useState(null)
  const [showRetryModal, setShowRetryModal] = useState(false)
  const [retryPaymentData, setRetryPaymentData] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])
  const { currentUser } = useAuth()

  useEffect(() => {
    // Load payment history on component mount
    const history = paymentService.getPaymentHistory()
    setPaymentHistory(history)
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const paymentData = {
        tx_ref: `PSTACK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount: total,
        customer: {
          email: currentUser?.email || 'customer@example.com',
          name: currentUser?.displayName || 'Customer',
        },
        user: currentUser,
        customizations: {
          title: 'Ojawa eCommerce',
          description: 'Payment for items in cart',
          logo: 'https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-online-shop-log.jpg',
        },
      }

      setPaymentId(paymentData.tx_ref)

      const result = await paymentService.initiatePayment(paymentData, {
        maxRetries: 3,
        retryDelay: 2000,
        timeoutDuration: 30000,
        onProgress: (progress) => {
          errorLogger.info('Payment progress', progress)
        },
        onSuccess: async (successResult) => {
          try {
            // Create order in Firestore
            const orderId = await createOrder(successResult.transactionId)

            // Send payment confirmation email (optional)
            try {
              const { httpsCallable } = await import('firebase/functions')
              const { functions } = await import('../firebase/config')
              const sendPaymentConfirmation = httpsCallable(functions, 'sendPaymentConfirmation')
              await sendPaymentConfirmation({
                buyerEmail: currentUser.email,
                buyerName: currentUser.displayName || 'Customer',
                orderId: orderId,
                amount: Math.round(total * 100),
                items: cartItems
              })
            } catch (emailError) {
              errorLogger.warn('Failed to send payment confirmation email', emailError)
            }

            // Update payment history
            const updatedHistory = paymentService.getPaymentHistory()
            setPaymentHistory(updatedHistory)

            onSuccess({
              id: successResult.transactionId,
              status: 'succeeded',
              provider: 'paystack'
            })

          } catch (orderError) {
            errorLogger.error('Order creation failed after successful payment', orderError)
            setError('Order creation failed after successful payment. Please contact support.')
            setLoading(false)
          }
        },
        onFailure: (failureError) => {
          errorLogger.error('Payment failed', failureError)
          
          // Prepare retry data
          setRetryPaymentData({
            ...paymentData,
            originalError: failureError
          })
          
          // Show retry modal for certain error types
          if (isRetryableError(failureError)) {
            setShowRetryModal(true)
          } else {
            setError(getErrorMessage(failureError))
          }
          
          setLoading(false)
        },
        onRetry: (retryData) => {
          errorLogger.info('Payment retrying', retryData)
          // Could show retry progress indicator
        }
      })

    } catch (error) {
      errorLogger.error('Payment initialization error', error)
      setError('Failed to initialize payment. Please check your internet connection and try again.')
      setLoading(false)
    }
  }

  const handleRetrySuccess = (result) => {
    setShowRetryModal(false)
    setRetryPaymentData(null)
    
    // Handle successful retry
    onSuccess({
      id: result.transactionId,
      status: 'succeeded',
      provider: 'paystack'
    })
  }

  const handleRetryFailure = (error) => {
    errorLogger.error('Payment retry failed', error)
    setError(getErrorMessage(error))
    setShowRetryModal(false)
    setRetryPaymentData(null)
  }

  const isRetryableError = (error) => {
    const retryableErrors = [
      PAYMENT_ERROR_TYPES.NETWORK_ERROR,
      PAYMENT_ERROR_TYPES.TIMEOUT,
      PAYMENT_ERROR_TYPES.UNKNOWN_ERROR
    ]
    return retryableErrors.includes(error.type)
  }

  const getErrorMessage = (error) => {
    if (error.type === PAYMENT_ERROR_TYPES.INSUFFICIENT_FUNDS) {
      return 'Insufficient funds. Please check your account balance or try a different payment method.'
    } else if (error.type === PAYMENT_ERROR_TYPES.CARD_DECLINED) {
      return 'Your card was declined. Please try a different card or contact your bank.'
    } else if (error.type === PAYMENT_ERROR_TYPES.INVALID_CARD) {
      return 'Invalid card details. Please check your card information and try again.'
    } else if (error.type === PAYMENT_ERROR_TYPES.EXPIRED_CARD) {
      return 'Your card has expired. Please use a different card.'
    } else if (error.type === PAYMENT_ERROR_TYPES.NETWORK_ERROR) {
      return 'Network error. Please check your internet connection and try again.'
    } else if (error.type === PAYMENT_ERROR_TYPES.TIMEOUT) {
      return 'Payment timeout. Please try again.'
    } else {
      return error.message || 'Payment failed. Please try again.'
    }
  }

  const createOrder = async (txnId) => {
    try {
      // Resolve vendorId for each product to ensure vendor dashboards see the order
      const itemsWithVendors = []
      for (const item of cartItems) {
        let resolvedVendorId = item.vendorId
        if (!resolvedVendorId && item.id) {
          try {
            const prodSnap = await getDoc(doc(db, 'products', item.id))
            if (prodSnap.exists()) {
              resolvedVendorId = prodSnap.data().vendorId || resolvedVendorId
            }
          } catch (_) {}
        }
        itemsWithVendors.push({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          vendorId: resolvedVendorId || 'unknown'
        })
      }

      // For now we assume single-vendor orders; use first item's vendorId
      const orderVendorId = itemsWithVendors[0]?.vendorId || null

      const orderData = {
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || 'Customer',
        buyerEmail: currentUser.email,
        vendorId: orderVendorId,
        items: itemsWithVendors,
        totalAmount: total,
        status: ORDER_STATUS.CONFIRMED, // Start with confirmed status
        paymentStatus: 'completed',
        paymentMethod: 'paystack',
        paymentReference: txnId,
        shippingAddress: orderDetails?.shippingAddress || {},
        logisticsPartnerId: orderDetails?.logisticsPartnerId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Create order using the service (which will set trackingId = orderId)
      const orderId = await firebaseService.orders.create(orderData)
      
      errorLogger.info('Order created successfully', {
        orderId: orderId,
        trackingId: orderId, // Order ID is now the tracking ID
        transactionId: txnId,
        totalAmount: total
      })

      return orderId
    } catch (error) {
      errorLogger.error('Failed to create order', error)
      throw error
    }
  }

  return (
    <ComponentErrorBoundary componentName="EnhancedCheckoutForm">
      <div className="space-y-6">
        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Payments</h3>
            <div className="space-y-2">
              {paymentHistory.slice(-3).map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center">
                    <span className="text-sm">
                      {payment.status === PAYMENT_STATUS.SUCCESS ? '✅' : 
                       payment.status === PAYMENT_STATUS.FAILED ? '❌' : '⏳'}
                    </span>
                    <span className="ml-2 text-sm text-gray-600">
                      ${payment.amount?.toFixed(2)} - {new Date(payment.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    payment.status === PAYMENT_STATUS.SUCCESS ? 'bg-green-100 text-green-800' :
                    payment.status === PAYMENT_STATUS.FAILED ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Payment Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                {isRetryableError({ type: 'network_error' }) && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowRetryModal(true)}
                      className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200"
                    >
                      Retry Payment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount
                </label>
                <div className="text-2xl font-bold text-emerald-600">
                  ${total.toFixed(2)}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Paystack</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Secure
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-3 px-4 rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing Payment...
                  </div>
                ) : (
                  'Pay Now'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Payment Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Secure Payment
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Your payment is processed securely through Paystack. We support multiple payment methods including cards, bank transfers, and USSD.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Retry Modal */}
      <PaymentRetryModal
        isOpen={showRetryModal}
        onClose={() => {
          setShowRetryModal(false)
          setRetryPaymentData(null)
        }}
        paymentData={retryPaymentData}
        onSuccess={handleRetrySuccess}
        onFailure={handleRetryFailure}
        orderId={paymentId}
      />
    </ComponentErrorBoundary>
  )
}

export default EnhancedCheckoutForm
