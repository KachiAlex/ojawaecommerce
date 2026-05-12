import { errorLogger } from '../utils/errorLogger'
import secureStorage from '../utils/secureStorage'
import { openPaystackCheckout, loadPaystackScript } from '../utils/paystack'

// Payment configuration
export const PAYMENT_CONFIG = {
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds
  timeoutDuration: 30000, // 30 seconds
  paystack: {
    currency: 'NGN',
    referencePrefix: 'CHK',
  }
}

// Payment status definitions
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout',
  RETRYING: 'retrying'
}

// Payment error types
export const PAYMENT_ERROR_TYPES = {
  NETWORK_ERROR: 'network_error',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  CARD_DECLINED: 'card_declined',
  TIMEOUT: 'timeout',
  INVALID_CARD: 'invalid_card',
  EXPIRED_CARD: 'expired_card',
  UNKNOWN_ERROR: 'unknown_error'
}

// Payment retry manager
export class PaymentRetryManager {
  constructor() {
    this.retryAttempts = new Map()
    this.activePayments = new Map()
  }

  // Initialize payment with retry logic
  async initiatePayment(paymentData, options = {}) {
    const {
      maxRetries = PAYMENT_CONFIG.maxRetries,
      retryDelay = PAYMENT_CONFIG.retryDelay,
      timeoutDuration = PAYMENT_CONFIG.timeoutDuration,
      onProgress,
      onSuccess,
      onFailure,
      onRetry
    } = options

    const paymentOptions = {
      maxRetries,
      retryDelay,
      timeoutDuration,
      onProgress,
      onSuccess,
      onFailure,
      onRetry
    }

    const paymentId = paymentData.tx_ref || `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Initialize retry tracking
    this.retryAttempts.set(paymentId, {
      attempts: 0,
      maxRetries,
      lastError: null,
      startTime: Date.now()
    })

    try {
      // Ensure Paystack inline script is available
      await loadPaystackScript()
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.handlePaymentTimeout(paymentId, timeoutDuration)
      }, timeoutDuration)

      // Track active payment
      this.activePayments.set(paymentId, {
        timeoutId,
        paymentData,
        options: paymentOptions
      })

      // Execute payment
      const result = await this.executePayment(paymentData, paymentId, {
        onProgress,
        onSuccess,
        onFailure,
        onRetry
      })

      // Clean up
      this.cleanupPayment(paymentId)
      return result

    } catch (error) {
      this.cleanupPayment(paymentId)
      throw error
    }
  }

  // Execute payment with Paystack
  async executePayment(paymentData, paymentId, callbacks) {
    const { onProgress, onSuccess, onFailure, onRetry } = callbacks

    return new Promise((resolve, reject) => {
      const runPayment = async () => {
        onProgress?.({ stage: 'initializing', paymentId })

        const referencePrefix = paymentData.referencePrefix || PAYMENT_CONFIG.paystack.referencePrefix
        const currency = paymentData.currency || PAYMENT_CONFIG.paystack.currency
        const metadata = {
          ...paymentData.metadata,
          paymentId,
          customerEmail: paymentData?.customer?.email,
          userId: paymentData?.user?.uid,
        }

        const paystackResult = await openPaystackCheckout({
          user: paymentData.user,
          amount: paymentData.amount,
          currency,
          referencePrefix,
          metadata,
          customizations: paymentData.customizations,
        })

        const response = {
          status: 'success',
          transaction_id: paystackResult.reference,
          reference: paystackResult.reference,
          amount: paymentData.amount,
          currency,
          metadata,
        }

        await this.handlePaymentCallback(response, paymentId, {
          onSuccess: (result) => {
            onSuccess?.(result)
            resolve(result)
          },
          onFailure: (error) => {
            onFailure?.(error)
            reject(error)
          },
          onRetry: async (retryData) => {
            onRetry?.(retryData)
            await this.handlePaymentRetry(retryData, callbacks)
          }
        })
      }

      runPayment().catch(async (error) => {
        const failureResponse = {
          status: error.message === 'Payment window closed' ? 'cancelled' : 'failed',
          code: error.code,
          message: error.message,
          amount: paymentData.amount,
          reference: paymentData.tx_ref,
        }

        await this.handlePaymentCallback(failureResponse, paymentId, {
          onSuccess: (result) => {
            onSuccess?.(result)
            resolve(result)
          },
          onFailure: (err) => {
            onFailure?.(err)
            reject(err)
          },
          onRetry: async (retryData) => {
            onRetry?.(retryData)
            await this.handlePaymentRetry(retryData, callbacks)
          }
        })
      })
    })
  }

  // Handle payment callback
  async handlePaymentCallback(response, paymentId, callbacks) {
    const retryInfo = this.retryAttempts.get(paymentId)
    
    errorLogger.info('Payment callback received', {
      paymentId,
      status: response.status,
      transactionId: response.transaction_id,
      attempt: retryInfo?.attempts || 0
    })

    if (response.status === 'successful' || response.status === 'completed' || response.status === 'success') {
      // Payment successful
      await this.recordSuccessfulPayment(paymentId, response)
      callbacks.onSuccess({
        paymentId,
        transactionId: response.transaction_id || response.reference,
        status: PAYMENT_STATUS.SUCCESS,
        response
      })
    } else if (response.status === 'cancelled') {
      // Payment cancelled
      await this.recordCancelledPayment(paymentId, response)
      callbacks.onFailure(new Error('Payment cancelled by user'))
    } else {
      // Payment failed
      await this.recordFailedPayment(paymentId, response)
      
      // Check if we should retry
      if (retryInfo && retryInfo.attempts < retryInfo.maxRetries) {
        const retryData = {
          paymentId,
          originalPayment: this.activePayments.get(paymentId)?.paymentData,
          error: this.categorizePaymentError(response),
          attempt: retryInfo.attempts + 1,
          maxRetries: retryInfo.maxRetries
        }
        
        callbacks.onRetry(retryData)
      } else {
        const error = this.categorizePaymentError(response)
        callbacks.onFailure(error)
      }
    }
  }

  // Handle payment retry
  async handlePaymentRetry(retryData, callbacks) {
    const { paymentId, originalPayment, error, attempt, maxRetries } = retryData
    
    errorLogger.info('Retrying payment', {
      paymentId,
      attempt,
      maxRetries,
      errorType: error.type
    })

    // Update retry tracking
    const retryInfo = this.retryAttempts.get(paymentId)
    if (retryInfo) {
      retryInfo.attempts = attempt
      retryInfo.lastError = error
    }

    // Wait before retry
    const retryDelay = this.activePayments.get(paymentId)?.options?.retryDelay || PAYMENT_CONFIG.retryDelay
    await this.delay(retryDelay * attempt)

    try {
      // Retry payment with updated reference
      const retryPaymentData = {
        ...originalPayment,
        tx_ref: `${originalPayment.tx_ref}_retry_${attempt}`,
        customizations: {
          ...originalPayment.customizations,
          title: `Retry ${attempt}/${maxRetries} - ${originalPayment.customizations.title}`
        }
      }

      const result = await this.executePayment(retryPaymentData, paymentId, callbacks)
      return result
    } catch (retryError) {
      if (attempt >= maxRetries) {
        errorLogger.error('Payment retry exhausted', {
          paymentId,
          finalAttempt: attempt,
          error: retryError
        })
        throw retryError
      }
      
      // Continue retrying
      return this.handlePaymentRetry({
        ...retryData,
        attempt: attempt + 1
      }, callbacks)
    }
  }

  // Handle payment timeout
  handlePaymentTimeout(paymentId, timeoutDuration) {
    errorLogger.warn('Payment timeout', {
      paymentId,
      timeoutDuration
    })

    const retryInfo = this.retryAttempts.get(paymentId)
    if (retryInfo && retryInfo.attempts < retryInfo.maxRetries) {
      // Retry on timeout
      this.handlePaymentRetry({
        paymentId,
        originalPayment: this.activePayments.get(paymentId)?.paymentData,
        error: new Error('Payment timeout'),
        attempt: retryInfo.attempts + 1,
        maxRetries: retryInfo.maxRetries
      }, this.activePayments.get(paymentId)?.options || {})
    } else {
      // Timeout after max retries
      this.recordFailedPayment(paymentId, { status: 'timeout' })
      const timeoutError = new Error('Payment timeout after maximum retries')
      timeoutError.type = PAYMENT_ERROR_TYPES.TIMEOUT
      throw timeoutError
    }
  }

  // Handle payment cancellation
  handlePaymentCancellation(paymentId) {
    errorLogger.info('Payment cancelled', { paymentId })
    this.recordCancelledPayment(paymentId, { status: 'cancelled' })
  }

  // Categorize payment error
  categorizePaymentError(response) {
    const error = new Error(response.message || 'Payment failed')
    
    const errorMappings = {
      insufficient_funds: PAYMENT_ERROR_TYPES.INSUFFICIENT_FUNDS,
      card_declined: PAYMENT_ERROR_TYPES.CARD_DECLINED,
      invalid_card: PAYMENT_ERROR_TYPES.INVALID_CARD,
      expired_card: PAYMENT_ERROR_TYPES.EXPIRED_CARD,
      network_error: PAYMENT_ERROR_TYPES.NETWORK_ERROR,
      timeout: PAYMENT_ERROR_TYPES.TIMEOUT,
      cancelled: PAYMENT_ERROR_TYPES.CANCELLED,
    }

    error.type = errorMappings[response.code] || errorMappings[response.status] || PAYMENT_ERROR_TYPES.UNKNOWN_ERROR
    error.code = response.code || response.status
    error.response = response
    
    return error
  }

  // Record successful payment
  async recordSuccessfulPayment(paymentId, response) {
    errorLogger.info('Payment successful', {
      paymentId,
      transactionId: response.transaction_id,
      amount: response.amount
    })
    
    // Could store in local storage or send to analytics
    const paymentRecord = {
      paymentId,
      status: PAYMENT_STATUS.SUCCESS,
      transactionId: response.transaction_id || response.reference,
      amount: response.amount,
      timestamp: new Date(),
      response
    }
    
    this.storePaymentRecord(paymentRecord)
  }

  // Record failed payment
  async recordFailedPayment(paymentId, response) {
    const retryInfo = this.retryAttempts.get(paymentId)
    
    errorLogger.error('Payment failed', {
      paymentId,
      attempts: retryInfo?.attempts || 0,
      maxRetries: retryInfo?.maxRetries || 0,
      response
    })
    
    const paymentRecord = {
      paymentId,
      status: PAYMENT_STATUS.FAILED,
      attempts: retryInfo?.attempts || 0,
      timestamp: new Date(),
      response
    }
    
    this.storePaymentRecord(paymentRecord)
  }

  // Record cancelled payment
  async recordCancelledPayment(paymentId, response) {
    errorLogger.info('Payment cancelled', {
      paymentId,
      response
    })
    
    const paymentRecord = {
      paymentId,
      status: PAYMENT_STATUS.CANCELLED,
      timestamp: new Date(),
      response
    }
    
    this.storePaymentRecord(paymentRecord)
  }

  // Store payment record
  async storePaymentRecord(record) {
    try {
      const raw = await secureStorage.getItem('payment_records')
      const records = raw ? JSON.parse(raw) : []
      records.push(record)
      
      // Keep only last 50 records
      if (records.length > 50) {
        records.splice(0, records.length - 50)
      }
      
      await secureStorage.setItem('payment_records', JSON.stringify(records))
    } catch (error) {
      errorLogger.error('Failed to store payment record', error)
    }
  }

  // Clean up payment tracking
  cleanupPayment(paymentId) {
    const payment = this.activePayments.get(paymentId)
    if (payment?.timeoutId) {
      clearTimeout(payment.timeoutId)
    }
    
    this.activePayments.delete(paymentId)
    this.retryAttempts.delete(paymentId)
  }

  // Utility: delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Get payment history
  async getPaymentHistory() {
    try {
      const raw = await secureStorage.getItem('payment_records')
      return raw ? JSON.parse(raw) : []
    } catch (error) {
      errorLogger.error('Failed to get payment history', error)
      return []
    }
  }

  // Get failed payments that can be retried
  async getRetryablePayments() {
    const history = await this.getPaymentHistory()
    return history.filter(record => 
      record.status === PAYMENT_STATUS.FAILED && 
      record.attempts < PAYMENT_CONFIG.maxRetries
    )
  }
}

// Export singleton instance
export const paymentRetryManager = new PaymentRetryManager()

// Export payment service functions
export const paymentService = {
  // Initiate payment with retry logic
  async initiatePayment(paymentData, options = {}) {
    return paymentRetryManager.initiatePayment(paymentData, options)
  },

  // Retry failed payment
  async retryPayment(paymentId, options = {}) {
    const history = paymentRetryManager.getPaymentHistory()
    const paymentRecord = history.find(record => record.paymentId === paymentId)
    
    if (!paymentRecord) {
      throw new Error('Payment record not found')
    }

    if (paymentRecord.status === PAYMENT_STATUS.SUCCESS) {
      throw new Error('Payment already successful')
    }

    // Reconstruct original payment data
    const originalPayment = {
      tx_ref: paymentRecord.paymentId,
      amount: paymentRecord.amount,
      customer: paymentRecord.customer,
      customizations: paymentRecord.customizations
    }

    return paymentRetryManager.initiatePayment(originalPayment, {
      ...options,
      maxRetries: PAYMENT_CONFIG.maxRetries - paymentRecord.attempts
    })
  },

  // Get payment status
  getPaymentStatus(paymentId) {
    const history = paymentRetryManager.getPaymentHistory()
    const record = history.find(record => record.paymentId === paymentId)
    return record?.status || PAYMENT_STATUS.PENDING
  },

  // Get payment history
  getPaymentHistory() {
    return paymentRetryManager.getPaymentHistory()
  },

  // Get retryable payments
  getRetryablePayments() {
    return paymentRetryManager.getRetryablePayments()
  },

  // Clear payment history
  clearPaymentHistory() {
    localStorage.removeItem('payment_records')
  }
}
