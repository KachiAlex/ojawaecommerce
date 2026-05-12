import { useState, useEffect, useCallback } from 'react'
import { paymentService, PAYMENT_STATUS } from '../services/paymentService'
import { errorLogger } from '../utils/errorLogger'

export const usePaymentStatus = (paymentId) => {
  const [paymentStatus, setPaymentStatus] = useState(PAYMENT_STATUS.PENDING)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Get payment status
  const getPaymentStatus = useCallback(() => {
    if (!paymentId) return PAYMENT_STATUS.PENDING
    
    try {
      const status = paymentService.getPaymentStatus(paymentId)
      setPaymentStatus(status)
      return status
    } catch (error) {
      errorLogger.error('Failed to get payment status', error)
      setError('Failed to get payment status')
      return PAYMENT_STATUS.PENDING
    }
  }, [paymentId])

  // Get payment history
  const getPaymentHistory = useCallback(() => {
    try {
      const history = paymentService.getPaymentHistory()
      setPaymentHistory(history)
      return history
    } catch (error) {
      errorLogger.error('Failed to get payment history', error)
      setError('Failed to get payment history')
      return []
    }
  }, [])

  // Retry failed payment
  const retryPayment = useCallback(async (retryOptions = {}) => {
    if (!paymentId) {
      throw new Error('No payment ID provided')
    }

    setLoading(true)
    setError(null)

    try {
      const result = await paymentService.retryPayment(paymentId, retryOptions)
      
      // Update status after retry
      getPaymentStatus()
      getPaymentHistory()
      
      return result
    } catch (error) {
      errorLogger.error('Payment retry failed', error)
      setError(error.message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [paymentId, getPaymentStatus, getPaymentHistory])

  // Get retryable payments
  const getRetryablePayments = useCallback(() => {
    try {
      return paymentService.getRetryablePayments()
    } catch (error) {
      errorLogger.error('Failed to get retryable payments', error)
      return []
    }
  }, [])

  // Clear payment history
  const clearPaymentHistory = useCallback(() => {
    try {
      paymentService.clearPaymentHistory()
      setPaymentHistory([])
    } catch (error) {
      errorLogger.error('Failed to clear payment history', error)
      setError('Failed to clear payment history')
    }
  }, [])

  // Check if payment can be retried
  const canRetry = useCallback(() => {
    return paymentStatus === PAYMENT_STATUS.FAILED
  }, [paymentStatus])

  // Get payment status display info
  const getStatusInfo = useCallback(() => {
    const statusInfo = {
      [PAYMENT_STATUS.PENDING]: {
        label: 'Pending',
        color: 'text-yellow-600 bg-yellow-100',
        icon: '⏳',
        description: 'Payment is being processed'
      },
      [PAYMENT_STATUS.PROCESSING]: {
        label: 'Processing',
        color: 'text-blue-600 bg-blue-100',
        icon: '🔄',
        description: 'Payment is being processed'
      },
      [PAYMENT_STATUS.SUCCESS]: {
        label: 'Success',
        color: 'text-green-600 bg-green-100',
        icon: '✅',
        description: 'Payment completed successfully'
      },
      [PAYMENT_STATUS.FAILED]: {
        label: 'Failed',
        color: 'text-red-600 bg-red-100',
        icon: '❌',
        description: 'Payment failed'
      },
      [PAYMENT_STATUS.CANCELLED]: {
        label: 'Cancelled',
        color: 'text-gray-600 bg-gray-100',
        icon: '🚫',
        description: 'Payment was cancelled'
      },
      [PAYMENT_STATUS.TIMEOUT]: {
        label: 'Timeout',
        color: 'text-orange-600 bg-orange-100',
        icon: '⏰',
        description: 'Payment timed out'
      },
      [PAYMENT_STATUS.RETRYING]: {
        label: 'Retrying',
        color: 'text-purple-600 bg-purple-100',
        icon: '🔄',
        description: 'Payment is being retried'
      }
    }

    return statusInfo[paymentStatus] || statusInfo[PAYMENT_STATUS.PENDING]
  }, [paymentStatus])

  // Load initial data
  useEffect(() => {
    if (paymentId) {
      getPaymentStatus()
    }
    getPaymentHistory()
  }, [paymentId, getPaymentStatus, getPaymentHistory])

  // Poll for status updates (for pending payments)
  useEffect(() => {
    if (paymentStatus === PAYMENT_STATUS.PENDING || paymentStatus === PAYMENT_STATUS.PROCESSING) {
      const interval = setInterval(() => {
        getPaymentStatus()
      }, 5000) // Poll every 5 seconds

      return () => clearInterval(interval)
    }
  }, [paymentStatus, getPaymentStatus])

  return {
    // State
    paymentStatus,
    paymentHistory,
    loading,
    error,
    
    // Actions
    getPaymentStatus,
    getPaymentHistory,
    retryPayment,
    getRetryablePayments,
    clearPaymentHistory,
    
    // Computed
    canRetry,
    getStatusInfo,
    
    // Status checks
    isPending: paymentStatus === PAYMENT_STATUS.PENDING,
    isProcessing: paymentStatus === PAYMENT_STATUS.PROCESSING,
    isSuccess: paymentStatus === PAYMENT_STATUS.SUCCESS,
    isFailed: paymentStatus === PAYMENT_STATUS.FAILED,
    isCancelled: paymentStatus === PAYMENT_STATUS.CANCELLED,
    isTimeout: paymentStatus === PAYMENT_STATUS.TIMEOUT,
    isRetrying: paymentStatus === PAYMENT_STATUS.RETRYING
  }
}

export default usePaymentStatus
