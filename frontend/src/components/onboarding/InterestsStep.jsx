import React, { useState } from 'react'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { INTEREST_CATEGORIES } from '../../services/onboardingService'

const InterestsStep = () => {
  const { completeStep, currentStep, progress, getStepData, skipStep } = useOnboarding()
  const [isLoading, setIsLoading] = useState(false)
  
  // Initialize with existing data or empty array
  const existingData = getStepData(currentStep.id) || {}
  const [selectedInterests, setSelectedInterests] = useState(existingData.interests || [])

  const interestOptions = [
    { id: INTEREST_CATEGORIES.ELECTRONICS, label: 'Electronics', icon: '📱', description: 'Phones, laptops, gadgets' },
    { id: INTEREST_CATEGORIES.FASHION, label: 'Fashion', icon: '👗', description: 'Clothing, shoes, accessories' },
    { id: INTEREST_CATEGORIES.HOME_GARDEN, label: 'Home & Garden', icon: '🏠', description: 'Furniture, decor, tools' },
    { id: INTEREST_CATEGORIES.HEALTH_BEAUTY, label: 'Health & Beauty', icon: '💄', description: 'Skincare, makeup, wellness' },
    { id: INTEREST_CATEGORIES.SPORTS_FITNESS, label: 'Sports & Fitness', icon: '⚽', description: 'Equipment, apparel, nutrition' },
    { id: INTEREST_CATEGORIES.BOOKS_MEDIA, label: 'Books & Media', icon: '📚', description: 'Books, movies, music' },
    { id: INTEREST_CATEGORIES.AUTOMOTIVE, label: 'Automotive', icon: '🚗', description: 'Car parts, accessories' },
    { id: INTEREST_CATEGORIES.FOOD_BEVERAGE, label: 'Food & Beverage', icon: '🍕', description: 'Gourmet, beverages, snacks' },
    { id: INTEREST_CATEGORIES.TRAVEL, label: 'Travel', icon: '✈️', description: 'Luggage, travel accessories' },
    { id: INTEREST_CATEGORIES.PETS, label: 'Pets', icon: '🐕', description: 'Pet supplies, toys, food' }
  ]

  const handleInterestToggle = (interestId) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId)
      } else {
        return [...prev, interestId]
      }
    })
  }

  const handleContinue = async () => {
    setIsLoading(true)
    
    try {
      const success = await completeStep(currentStep.id, { interests: selectedInterests })
      if (!success) {
        console.error('Failed to complete step')
      }
    } catch (error) {
      console.error('Error completing step:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = async () => {
    setIsLoading(true)
    
    try {
      const success = await skipStep(currentStep.id)
      if (!success) {
        console.error('Failed to skip step')
      }
    } catch (error) {
      console.error('Error skipping step:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">❤️</span>
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
              Choose Your Interests
            </h1>
            <p className="text-gray-600 mb-2">
              Select categories you're interested in to get personalized recommendations
            </p>
            <p className="text-sm text-gray-500">
              Select at least 3 categories for the best experience
            </p>
          </div>

          {/* Interest Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {interestOptions.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id)
              
              return (
                <button
                  key={interest.id}
                  onClick={() => handleInterestToggle(interest.id)}
                  className={`p-6 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-lg ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl">{interest.icon}</div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg mb-1 ${
                        isSelected ? 'text-emerald-700' : 'text-gray-900'
                      }`}>
                        {interest.label}
                      </h3>
                      <p className={`text-sm ${
                        isSelected ? 'text-emerald-600' : 'text-gray-600'
                      }`}>
                        {interest.description}
                      </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selection Summary */}
          {selectedInterests.length > 0 && (
            <div className="mb-6 p-4 bg-emerald-50 rounded-lg">
              <p className="text-emerald-700 font-medium">
                {selectedInterests.length} categor{selectedInterests.length === 1 ? 'y' : 'ies'} selected
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedInterests.map(interestId => {
                  const interest = interestOptions.find(opt => opt.id === interestId)
                  return (
                    <span
                      key={interestId}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800"
                    >
                      {interest?.icon} {interest?.label}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="flex-1 bg-gray-100 text-gray-700 py-4 px-8 rounded-xl text-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip for Now
            </button>
            
            <button
              onClick={handleContinue}
              disabled={isLoading || selectedInterests.length < 3}
              className="flex-1 bg-emerald-600 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                `Continue ${selectedInterests.length >= 3 ? '' : `(${3 - selectedInterests.length} more needed)`}`
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 text-center">
              💡 Don't worry, you can always update your interests later in your profile settings
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InterestsStep
