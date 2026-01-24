import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase/config'
import { config } from '../config/env'

const PAYSTACK_SCRIPT_URL = 'https://js.paystack.co/v2/inline.js'
let paystackScriptPromise = null

const getPaystackPublicKey = () => {
  return (
    config?.payments?.paystack?.publicKey ||
    import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY ||
    process.env?.VITE_PAYSTACK_PUBLIC_KEY ||
    process.env?.PAYSTACK_PUBLIC_KEY ||
    ''
  )
}

export const loadPaystackScript = () => {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.PaystackPop) return Promise.resolve()

  if (!paystackScriptPromise) {
    paystackScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${PAYSTACK_SCRIPT_URL}"]`)
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve())
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Paystack script')))
        return
      }

      const script = document.createElement('script')
      script.src = PAYSTACK_SCRIPT_URL
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Paystack script'))
      document.head.appendChild(script)
    })
  }

  return paystackScriptPromise
}

const baseCustomizations = {
  title: config?.app?.name ?? 'Ojawa',
  description: 'Secure payment',
  logo: '',
}

export const openPaystackCheckout = async ({
  user,
  amount,
  currency = 'NGN',
  referencePrefix = 'TX',
  metadata = {},
  customizations = {},
  onClose,
}) => {
  if (!user) {
    throw new Error('User is required to initiate Paystack payments')
  }

  const publicKey = getPaystackPublicKey()
  if (!publicKey) {
    throw new Error('Paystack public key not configured. Please set VITE_PAYSTACK_PUBLIC_KEY')
  }

  const numericAmount = Number(amount)
  if (!numericAmount || numericAmount <= 0) {
    throw new Error('Invalid payment amount')
  }

  await loadPaystackScript()
  const PaystackPop = window.PaystackPop
  if (!PaystackPop) {
    throw new Error('Unable to initialize Paystack inline payment')
  }

  const reference = `${referencePrefix}-${user.uid}-${Date.now()}`

  return new Promise((resolve, reject) => {
    const transactionPayload = {
      key: publicKey,
      email: user.email || 'customer@example.com',
      amount: Math.round(numericAmount * 100),
      currency,
      ref: reference,
      metadata: {
        ...metadata,
        full_name: user.displayName || 'Ojawa User',
        userId: user.uid,
      },
      customizations: {
        ...baseCustomizations,
        ...customizations,
      },
      onSuccess: (response) => {
        resolve({ reference: response.reference, status: response.status || 'success' })
      },
      onCancel: () => {
        if (typeof onClose === 'function') onClose()
        reject(new Error('Payment window closed'))
      },
    }

    try {
      // Preferred SDK usage (v2)
      if (typeof PaystackPop === 'function' && PaystackPop.prototype?.newTransaction) {
        const handler = new PaystackPop()
        handler.newTransaction(transactionPayload)
        return
      }

      // Fallback to legacy setup API for older SDKs
      if (typeof PaystackPop.setup === 'function') {
        const legacyHandler = PaystackPop.setup(transactionPayload)
        if (!legacyHandler || typeof legacyHandler.openIframe !== 'function') {
          throw new Error('Paystack inline handler could not be initialized')
        }
        legacyHandler.openIframe()
        return
      }

      throw new Error('Unsupported Paystack inline handler version')
    } catch (error) {
      reject(error)
    }
  })
}

export const openWalletTopUpCheckout = async ({ user, amount, currency = 'NGN' }) => {
  const paymentResult = await openPaystackCheckout({
    user,
    amount,
    currency,
    referencePrefix: 'WALLET',
    metadata: {
      purpose: 'wallet_topup',
    },
    customizations: {
      title: 'Ojawa Wallet',
      description: 'Add funds to wallet',
    },
  })

  const topupFn = httpsCallable(functions, 'topupWalletPaystack')
  const verification = await topupFn({
    reference: paymentResult.reference,
    userId: user.uid,
    amount: Number(amount),
  })

  return {
    success: true,
    reference: paymentResult.reference,
    data: verification?.data,
  }
}

export const openSubscriptionCheckout = async ({
  user,
  plan,
  price,
  metadata = {},
  description,
}) => {
  if (!plan) {
    throw new Error('Subscription plan is required for Paystack checkout')
  }

  const paymentResult = await openPaystackCheckout({
    user,
    amount: price,
    referencePrefix: `SUB-${plan.toUpperCase()}`,
    metadata: {
      purpose: 'subscription',
      subscription_plan: plan,
      userId: user.uid,
      ...metadata,
    },
    customizations: {
      title: 'Ojawa Vendor Subscription',
      description: description || `Activate ${plan} plan`,
    },
  })

  return paymentResult
}

export const createSubscriptionRecord = async (subscriptionData) => {
  const subscriptionFn = httpsCallable(functions, 'createPaystackSubscriptionRecord')
  const response = await subscriptionFn(subscriptionData)
  return response?.data
}

export default {
  loadPaystackScript,
  openPaystackCheckout,
  openWalletTopUpCheckout,
  openSubscriptionCheckout,
  createSubscriptionRecord,
}
