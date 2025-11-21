import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../contexts/OnboardingContext'

const CompletedStep = () => {
  const { completeStep, currentStep, progress, getAllStepsData } = useOnboarding()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    // Complete the onboarding when this step loads
    completeStep(currentStep.id)
  }, [completeStep, currentStep.id])

  useEffect(() => {
    // Countdown and redirect
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  const handleGoHome = () => {
    navigate('/')
  }

  const handleExploreProducts = () => {
    navigate('/products')
  }

  const onboardingData = getAllStepsData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Progress Bar - 100% */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-emerald-600 h-2 rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Onboarding Complete!
          </p>
        </div>

        {/* Success Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          {/* Success Animation */}
          <div className="mb-6">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-4xl">🎉</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to <span className="text-emerald-600">Ojawa</span>!
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Your account is all set up and ready to go. You can now enjoy secure shopping across Africa!
            </p>
          </div>

          {/* What's Next */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">What's Next?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="text-2xl mb-2">🛍️</div>
                <h3 className="font-semibold text-emerald-700 mb-1">Start Shopping</h3>
                <p className="text-sm text-emerald-600">Browse thousands of products from verified vendors</p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-2">💰</div>
                <h3 className="font-semibold text-blue-700 mb-1">Fund Your Wallet</h3>
                <p className="text-sm text-blue-600">Add funds to your secure wallet for easy payments</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl mb-2">📱</div>
                <h3 className="font-semibold text-purple-700 mb-1">Get Notifications</h3>
                <p className="text-sm text-purple-600">Stay updated on your orders and deals</p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl mb-2">⭐</div>
                <h3 className="font-semibold text-orange-700 mb-1">Rate & Review</h3>
                <p className="text-sm text-orange-600">Share your experience and help others</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {onboardingData && Object.keys(onboardingData).length > 0 && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Your Profile Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {onboardingData.profile_setup && (
                  <div>
                    <div className="text-lg font-semibold text-emerald-600">✓</div>
                    <div className="text-sm text-gray-600">Profile</div>
                  </div>
                )}
                {onboardingData.interests && onboardingData.interests.interests && (
                  <div>
                    <div className="text-lg font-semibold text-emerald-600">
                      {onboardingData.interests.interests.length}
                    </div>
                    <div className="text-sm text-gray-600">Interests</div>
                  </div>
                )}
                {onboardingData.wallet_setup && (
                  <div>
                    <div className="text-lg font-semibold text-emerald-600">✓</div>
                    <div className="text-sm text-gray-600">Wallet</div>
                  </div>
                )}
                <div>
                  <div className="text-lg font-semibold text-emerald-600">100%</div>
                  <div className="text-sm text-gray-600">Complete</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleExploreProducts}
              className="w-full bg-emerald-600 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
            >
              Start Shopping Now
            </button>
            
            <button
              onClick={handleGoHome}
              className="w-full bg-gray-100 text-gray-700 py-3 px-8 rounded-xl text-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Auto Redirect Notice */}
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-blue-700">
            <span className="font-semibold">Redirecting to home page in {countdown} seconds...</span>
            <br />
            <span className="text-sm">Or click the buttons above to navigate manually</span>
          </p>
        </div>

        {/* Welcome Message */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-2">Thank you for choosing Ojawa!</p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <span>🔒 Secure</span>
            <span>⚡ Fast</span>
            <span>🌍 Reliable</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompletedStep
