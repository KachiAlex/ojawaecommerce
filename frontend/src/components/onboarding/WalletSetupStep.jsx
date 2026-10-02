import React, { useState } from 'react'
import { useOnboarding } from '../../contexts/OnboardingContext'

const WalletSetupStep = () => {
  const { completeStep, currentStep, progress, getStepData } = useOnboarding()
  const [isLoading, setIsLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  
  // Initialize with existing data
  const existingData = getStepData(currentStep.id) || {}
  const [walletSettings, setWalletSettings] = useState({
    autoTopUp: existingData.autoTopUp || false,
    spendingLimit: existingData.spendingLimit || '1000',
    currency: existingData.currency || 'NGN',
    ...existingData
  })

  const handleInputChange = (field, value) => {
    setWalletSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleContinue = async () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      return
    }

    setIsLoading(true)
    
    try {
      const stepData = {
        ...walletSettings,
        acceptedTerms,
        acceptedPrivacy,
        setupCompleted: true
      }
      
      const success = await completeStep(currentStep.id, stepData)
      if (!success) {
        console.error('Failed to complete step')
      }
    } catch (error) {
      console.error('Error completing step:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const currencyOptions = [
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' }
  ]

  const selectedCurrency = currencyOptions.find(c => c.code === walletSettings.currency)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">💰</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">
            Step {progress.completedSteps + 1} of {progress.totalSteps}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Set Up Your Wallet
            </h1>
            <p className="text-gray-600">
              Secure your payments with our escrow wallet system
            </p>
          </div>

          {/* Wallet Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="font-semibold text-emerald-700 mb-1">Secure</h3>
              <p className="text-sm text-emerald-600">Your money is protected</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-semibold text-blue-700 mb-1">Fast</h3>
              <p className="text-sm text-blue-600">Instant transactions</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">🌍</div>
              <h3 className="font-semibold text-purple-700 mb-1">Global</h3>
              <p className="text-sm text-purple-600">Multi-currency support</p>
            </div>
          </div>

          {/* Wallet Settings */}
          <div className="space-y-6 mb-8">
            {/* Currency Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preferred Currency
              </label>
              <div className="grid grid-cols-2 gap-3">
                {currencyOptions.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => handleInputChange('currency', currency.code)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      walletSettings.currency === currency.code
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">
                      {currency.symbol} {currency.code}
                    </div>
                    <div className="text-sm text-gray-600">{currency.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Spending Limit */}
            <div>
              <label htmlFor="spendingLimit" className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Spending Limit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  {selectedCurrency?.symbol}
                </span>
                <input
                  type="number"
                  id="spendingLimit"
                  value={walletSettings.spendingLimit}
                  onChange={(e) => handleInputChange('spendingLimit', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="1000"
                  min="100"
                  step="100"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Set a monthly limit to control your spending
              </p>
            </div>

            {/* Auto Top-up */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Auto Top-up</h3>
                <p className="text-sm text-gray-600">
                  Automatically add funds when your wallet balance is low
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={walletSettings.autoTopUp}
                  onChange={(e) => handleInputChange('autoTopUp', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Terms and Privacy */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I accept the{' '}
                <a href="/terms" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  Terms and Conditions
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="privacy"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="mt-1 w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
              />
              <label htmlFor="privacy" className="text-sm text-gray-700">
                I consent to the processing of my personal data for wallet services and payment processing
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleContinue}
            disabled={isLoading || !acceptedTerms || !acceptedPrivacy}
            className="w-full bg-emerald-600 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Setting up wallet...
              </div>
            ) : (
              'Set Up Wallet'
            )}
          </button>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-emerald-600">🛡️</span>
              <p className="text-sm text-emerald-700">
                Your wallet is protected by bank-level security and encryption
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WalletSetupStep
