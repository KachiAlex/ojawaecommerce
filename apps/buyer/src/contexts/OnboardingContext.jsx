import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import onboardingService, { ONBOARDING_STEPS, USER_TYPES } from '../services/onboardingService'
import { errorLogger } from '../utils/errorLogger'

const OnboardingContext = createContext()

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

export const OnboardingProvider = ({ children }) => {
  const [onboardingData, setOnboardingData] = useState(null)
  const [currentStep, setCurrentStep] = useState(null)
  const [progress, setProgress] = useState({ percentage: 0, completedSteps: 0, totalSteps: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const { currentUser, userProfile } = useAuth()

  // Initialize onboarding for new users
  const initializeOnboarding = useCallback(async () => {
    if (!currentUser) return

    setIsLoading(true)
    setError(null)

    try {
      // Check if onboarding is already completed
      const existingData = onboardingService.getOnboardingData(currentUser.uid)
      
      if (existingData && existingData.isCompleted) {
        setOnboardingData(existingData)
        setCurrentStep(onboardingService.getCurrentStep(currentUser.uid))
        setProgress(onboardingService.getOnboardingProgress(currentUser.uid))
        setIsLoading(false)
        return
      }

      // Start new onboarding
      const userType = userProfile?.role || USER_TYPES.BUYER
      const newOnboardingData = onboardingService.startOnboarding(currentUser.uid, userType)
      
      setOnboardingData(newOnboardingData)
      setCurrentStep(onboardingService.getCurrentStep(currentUser.uid))
      setProgress(onboardingService.getOnboardingProgress(currentUser.uid))

      errorLogger.info('Onboarding initialized', { userId: currentUser.uid, userType })
    } catch (err) {
      errorLogger.error('Failed to initialize onboarding', err)
      setError('Failed to initialize onboarding')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, userProfile])

  // Update step data
  const updateStepData = useCallback((stepId, data) => {
    if (!currentUser) return false

    try {
      const success = onboardingService.updateStepData(currentUser.uid, stepId, data)
      if (success) {
        setOnboardingData(onboardingService.getOnboardingData(currentUser.uid))
        return true
      }
      return false
    } catch (err) {
      errorLogger.error('Failed to update step data', err)
      setError('Failed to update step data')
      return false
    }
  }, [currentUser])

  // Complete a step
  const completeStep = useCallback(async (stepId, data = {}) => {
    if (!currentUser) return false

    setIsLoading(true)
    setError(null)

    try {
      // Validate step data if provided
      if (Object.keys(data).length > 0) {
        const validation = onboardingService.validateOnboardingData(currentUser.uid, stepId, data)
        if (!validation.isValid) {
          setError(validation.errors.join(', '))
          setIsLoading(false)
          return false
        }

        // Update step data
        updateStepData(stepId, data)
      }

      // Complete the step
      const success = onboardingService.completeStep(currentUser.uid, stepId)
      
      if (success) {
        const updatedData = onboardingService.getOnboardingData(currentUser.uid)
        const nextStep = onboardingService.getCurrentStep(currentUser.uid)
        const updatedProgress = onboardingService.getOnboardingProgress(currentUser.uid)

        setOnboardingData(updatedData)
        setCurrentStep(nextStep)
        setProgress(updatedProgress)

        errorLogger.info('Onboarding step completed', { userId: currentUser.uid, stepId })
        return true
      }
      
      return false
    } catch (err) {
      errorLogger.error('Failed to complete step', err)
      setError('Failed to complete step')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, updateStepData])

  // Skip a step
  const skipStep = useCallback(async (stepId) => {
    if (!currentUser) return false

    setIsLoading(true)
    setError(null)

    try {
      const success = onboardingService.skipStep(currentUser.uid, stepId)
      
      if (success) {
        const updatedData = onboardingService.getOnboardingData(currentUser.uid)
        const nextStep = onboardingService.getCurrentStep(currentUser.uid)
        const updatedProgress = onboardingService.getOnboardingProgress(currentUser.uid)

        setOnboardingData(updatedData)
        setCurrentStep(nextStep)
        setProgress(updatedProgress)

        errorLogger.info('Onboarding step skipped', { userId: currentUser.uid, stepId })
        return true
      }
      
      return false
    } catch (err) {
      errorLogger.error('Failed to skip step', err)
      setError('Failed to skip step')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  // Complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (!currentUser) return false

    setIsLoading(true)
    setError(null)

    try {
      const success = onboardingService.completeOnboarding(currentUser.uid)
      
      if (success) {
        const updatedData = onboardingService.getOnboardingData(currentUser.uid)
        const finalStep = onboardingService.getCurrentStep(currentUser.uid)
        const finalProgress = onboardingService.getOnboardingProgress(currentUser.uid)

        setOnboardingData(updatedData)
        setCurrentStep(finalStep)
        setProgress(finalProgress)

        errorLogger.info('Onboarding completed', { userId: currentUser.uid })
        return true
      }
      
      return false
    } catch (err) {
      errorLogger.error('Failed to complete onboarding', err)
      setError('Failed to complete onboarding')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  // Go to next step
  const goToNextStep = useCallback(async () => {
    if (!currentUser || !currentStep) return false

    try {
      const nextStep = onboardingService.getNextStep(currentUser.uid)
      if (nextStep) {
        setCurrentStep(nextStep)
        return true
      }
      return false
    } catch (err) {
      errorLogger.error('Failed to go to next step', err)
      return false
    }
  }, [currentUser, currentStep])

  // Go to previous step
  const goToPreviousStep = useCallback(async () => {
    if (!currentUser) return false

    try {
      const previousStep = onboardingService.getPreviousStep(currentUser.uid)
      if (previousStep) {
        setCurrentStep(previousStep)
        return true
      }
      return false
    } catch (err) {
      errorLogger.error('Failed to go to previous step', err)
      return false
    }
  }, [currentUser])

  // Get step data
  const getStepData = useCallback((stepId) => {
    if (!currentUser) return null
    return onboardingService.getStepData(currentUser.uid, stepId)
  }, [currentUser])

  // Get all steps data
  const getAllStepsData = useCallback(() => {
    if (!currentUser) return {}
    return onboardingService.getAllStepsData(currentUser.uid)
  }, [currentUser])

  // Check if onboarding is completed
  const isCompleted = useCallback(() => {
    if (!currentUser) return false
    return onboardingService.isOnboardingCompleted(currentUser.uid)
  }, [currentUser])

  // Reset onboarding
  const resetOnboarding = useCallback(() => {
    if (!currentUser) return false

    try {
      const success = onboardingService.resetOnboarding(currentUser.uid)
      if (success) {
        setOnboardingData(null)
        setCurrentStep(null)
        setProgress({ percentage: 0, completedSteps: 0, totalSteps: 0 })
        setError(null)
        return true
      }
      return false
    } catch (err) {
      errorLogger.error('Failed to reset onboarding', err)
      return false
    }
  }, [currentUser])

  // Get onboarding analytics
  const getAnalytics = useCallback(() => {
    return onboardingService.getOnboardingAnalytics()
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Initialize onboarding when user is available
  useEffect(() => {
    if (currentUser && !onboardingData && !isCompleted()) {
      initializeOnboarding()
    }
  }, [currentUser, onboardingData, isCompleted, initializeOnboarding])

  // Provide default onboarding data if none exists
  useEffect(() => {
    if (currentUser && !onboardingData && !isLoading) {
      // Create default onboarding data for existing users
      const defaultData = {
        userId: currentUser.uid,
        userType: userProfile?.role || 'buyer',
        currentStep: 'welcome',
        completedSteps: [],
        skippedSteps: [],
        data: {},
        startedAt: new Date(),
        completedAt: null,
        isCompleted: false
      }
      setOnboardingData(defaultData)
      setCurrentStep({
        id: 'welcome',
        title: 'Welcome to Ojawa!',
        description: 'Let\'s get you started with your personalized experience',
        component: 'WelcomeStep',
        duration: 2000,
        required: true,
        nextStep: 'profile_setup'
      })
    }
  }, [currentUser, userProfile, onboardingData, isLoading])

  // Update progress when onboarding data changes
  useEffect(() => {
    if (currentUser && onboardingData) {
      const updatedProgress = onboardingService.getOnboardingProgress(currentUser.uid)
      setProgress(updatedProgress)
    }
  }, [currentUser, onboardingData])

  const value = {
    // State
    onboardingData,
    currentStep,
    progress,
    isLoading,
    error,

    // Actions
    initializeOnboarding,
    updateStepData,
    completeStep,
    skipStep,
    completeOnboarding,
    goToNextStep,
    goToPreviousStep,
    resetOnboarding,
    clearError,

    // Getters
    getStepData,
    getAllStepsData,
    isCompleted,
    getAnalytics,

    // Constants
    ONBOARDING_STEPS,
    USER_TYPES
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export default OnboardingProvider
