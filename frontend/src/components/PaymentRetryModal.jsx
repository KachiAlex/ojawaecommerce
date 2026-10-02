import { useState, useEffect } from 'react'
import { paymentService, PAYMENT_STATUS, PAYMENT_ERROR_TYPES } from '../services/paymentService'
import { LoadingSpinner } from './LoadingStates'
import { errorLogger } from '../utils/errorLogger'

const PaymentRetryModal = ({ 
  isOpen, 
  onClose, 
  paymentData, 
  onSuccess, 
  onFailure,
  orderId 
}) => {
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [error, setError] = useState(null)
  const [retryHistory, setRetryHistory] = useState([])

  useEffect(() => {
    if (isOpen && paymentData) {
      loadRetryHistory()
      setRetryAttempt(0)
      setError(null)
    }
  }, [isOpen, paymentData])

  const loadRetryHistory = () => {
    try {
      const history = paymentService.getPaymentHistory()
      const paymentHistory = history.filter(record => 
        record.paymentId === paymentData?.tx_ref || 
        record.paymentId?.includes(paymentData?.tx_ref)
      )
      setRetryHistory(paymentHistory)
      setRetryAttempt(paymentHistory.length)
    } catch (error) {
      errorLogger.error('Failed to load retry history', error)
    }
  }

  const handleRetryPayment = async () => {
    if (!paymentData) return

    setIsRetrying(true)
    setError(null)

    try {
      const result = await paymentService.initiatePayment(paymentData, {
        maxRetries: 3,
        retryDelay: 2000,
        onProgress: (progress) => {
          errorLogger.info('Payment retry progress', progress)
        },
        onSuccess: (successResult) => {
          errorLogger.info('Payment retry successful', successResult)
          onSuccess?.(successResult)
          onClose()
        },
        onFailure: (failureError) => {
          errorLogger.error('Payment retry failed', failureError)
          setError(getErrorMessage(failureError))
          setIsRetrying(false)
          loadRetryHistory()
        },
        onRetry: (retryData) => {
          setRetryAttempt(retryData.attempt)
          errorLogger.info('Payment retrying', retryData)
        }
      })
    } catch (error) {
      errorLogger.error('Payment retry error', error)
      setError(getErrorMessage(error))
      setIsRetrying(false)
    }
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

  const getErrorIcon = (errorType) => {
    const icons = {
      [PAYMENT_ERROR_TYPES.INSUFFICIENT_FUNDS]: '💰',
      [PAYMENT_ERROR_TYPES.CARD_DECLINED]: '🚫',
      [PAYMENT_ERROR_TYPES.INVALID_CARD]: '❌',
      [PAYMENT_ERROR_TYPES.EXPIRED_CARD]: '📅',
      [PAYMENT_ERROR_TYPES.NETWORK_ERROR]: '🌐',
      [PAYMENT_ERROR_TYPES.TIMEOUT]: '⏰',
      [PAYMENT_ERROR_TYPES.UNKNOWN_ERROR]: '⚠️'
    }
    return icons[errorType] || '⚠️'
  }

  const getStatusColor = (status) => {
    const colors = {
      [PAYMENT_STATUS.SUCCESS]: 'text-green-600 bg-green-100',
      [PAYMENT_STATUS.FAILED]: 'text-red-600 bg-red-100',
      [PAYMENT_STATUS.CANCELLED]: 'text-yellow-600 bg-yellow-100',
      [PAYMENT_STATUS.PENDING]: 'text-blue-600 bg-blue-100',
      [PAYMENT_STATUS.RETRYING]: 'text-orange-600 bg-orange-100'
    }
    return colors[status] || 'text-gray-600 bg-gray-100'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Payment Retry
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isRetrying}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Payment Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Order #{orderId?.slice(-8)}</h4>
                <p className="text-sm text-gray-600">
                  Amount: ${paymentData?.amount?.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Attempts: {retryAttempt}/3</p>
                <p className="text-sm text-gray-600">
                  Status: <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(PAYMENT_STATUS.FAILED)}`}>
                    Failed
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400 text-xl">
                    {getErrorIcon(error.type || PAYMENT_ERROR_TYPES.UNKNOWN_ERROR)}
                  </span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Payment Failed
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Retry History */}
          {retryHistory.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Retry History</h4>
              <div className="space-y-2">
                {retryHistory.map((attempt, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-lg mr-3">
                        {attempt.status === PAYMENT_STATUS.SUCCESS ? '✅' : 
                         attempt.status === PAYMENT_STATUS.FAILED ? '❌' : 
                         attempt.status === PAYMENT_STATUS.CANCELLED ? '🚫' : '⏳'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Attempt {index + 1}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(attempt.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(attempt.status)}`}>
                      {attempt.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isRetrying}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRetryPayment}
              disabled={isRetrying || retryAttempt >= 3}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Retrying...
                </div>
              ) : (
                `Retry Payment ${retryAttempt > 0 ? `(${retryAttempt + 1}/3)` : ''}`
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-400 text-lg">💡</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Need Help?
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Check your internet connection</li>
                    <li>Verify your card details are correct</li>
                    <li>Ensure you have sufficient funds</li>
                    <li>Try a different payment method</li>
                    <li>Contact support if the issue persists</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentRetryModal
