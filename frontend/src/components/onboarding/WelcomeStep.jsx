import React from 'react'
import { useOnboarding } from '../../contexts/OnboardingContext'

const WelcomeStep = () => {
  const { completeStep, currentStep, progress } = useOnboarding()

  const handleGetStarted = () => {
    completeStep(currentStep.id)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">O</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Step {progress.completedSteps + 1} of {progress.totalSteps}
          </p>
        </div>

        {/* Welcome Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to <span className="text-emerald-600">Ojawa</span>! 🎉
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Your trusted marketplace for secure transactions across Africa. 
              Let's set up your account for the best shopping experience.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure Payments</h3>
              <p className="text-sm text-gray-600">
                Your money is protected with our escrow wallet system
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚚</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Fast Delivery</h3>
              <p className="text-sm text-gray-600">
                Reliable logistics partners across the continent
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⭐</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Quality Products</h3>
              <p className="text-sm text-gray-600">
                Verified vendors and authentic products
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-4">
            <button
              onClick={handleGetStarted}
              className="w-full bg-emerald-600 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
            >
              Get Started
            </button>
            
            <p className="text-sm text-gray-500">
              This will only take a few minutes
            </p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">Trusted by thousands of users across Africa</p>
          <div className="flex items-center justify-center space-x-8 opacity-60">
            <div className="text-gray-400">🇳🇬 Nigeria</div>
            <div className="text-gray-400">🇬🇭 Ghana</div>
            <div className="text-gray-400">🇰🇪 Kenya</div>
            <div className="text-gray-400">🇿🇦 South Africa</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeStep
