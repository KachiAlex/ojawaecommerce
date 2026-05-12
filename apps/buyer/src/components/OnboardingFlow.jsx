import React from 'react'
import { useOnboarding } from '../contexts/OnboardingContext'
import WelcomeStep from './onboarding/WelcomeStep'
import ProfileSetupStep from './onboarding/ProfileSetupStep'
import InterestsStep from './onboarding/InterestsStep'
import WalletSetupStep from './onboarding/WalletSetupStep'
import CompletedStep from './onboarding/CompletedStep'
import { LoadingSpinner } from './LoadingStates'
import ComponentErrorBoundary from './ComponentErrorBoundary'

const OnboardingFlow = () => {
  const { currentStep, isLoading, error } = useOnboarding()

  // Show loading state
  if (isLoading && !currentStep) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mx-auto mb-4" />
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Setup Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show appropriate step component
  if (!currentStep) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    )
  }

  const renderStepComponent = () => {
    switch (currentStep.id) {
      case 'welcome':
        return <WelcomeStep />
      case 'profile_setup':
        return <ProfileSetupStep />
      case 'preferences':
        return <ProfileSetupStep /> // Using same component for now
      case 'interests':
        return <InterestsStep />
      case 'wallet_setup':
        return <WalletSetupStep />
      case 'notifications':
        return <InterestsStep /> // Placeholder - using interests component
      case 'security':
        return <WalletSetupStep /> // Placeholder - using wallet component
      case 'completed':
        return <CompletedStep />
      default:
        return (
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">❓</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unknown Step</h2>
              <p className="text-gray-600">Step "{currentStep.id}" not found.</p>
            </div>
          </div>
        )
    }
  }

  return (
    <ComponentErrorBoundary componentName="OnboardingFlow">
      {renderStepComponent()}
    </ComponentErrorBoundary>
  )
}

export default OnboardingFlow
