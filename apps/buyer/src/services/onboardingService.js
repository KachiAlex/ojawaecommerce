import { errorLogger } from '../utils/errorLogger'

// Onboarding step types
export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  PROFILE_SETUP: 'profile_setup',
  PREFERENCES: 'preferences',
  INTERESTS: 'interests',
  WALLET_SETUP: 'wallet_setup',
  NOTIFICATIONS: 'notifications',
  SECURITY: 'security',
  COMPLETED: 'completed'
}

// User types for onboarding
export const USER_TYPES = {
  BUYER: 'buyer',
  VENDOR: 'vendor',
  LOGISTICS: 'logistics'
}

// Interest categories
export const INTEREST_CATEGORIES = {
  ELECTRONICS: 'electronics',
  FASHION: 'fashion',
  HOME_GARDEN: 'home_garden',
  HEALTH_BEAUTY: 'health_beauty',
  SPORTS_FITNESS: 'sports_fitness',
  BOOKS_MEDIA: 'books_media',
  AUTOMOTIVE: 'automotive',
  FOOD_BEVERAGE: 'food_beverage',
  TRAVEL: 'travel',
  PETS: 'pets'
}

// Notification preferences
export const NOTIFICATION_PREFERENCES = {
  ORDER_UPDATES: 'order_updates',
  PAYMENT_NOTIFICATIONS: 'payment_notifications',
  SHIPPING_UPDATES: 'shipping_updates',
  PROMOTIONAL: 'promotional',
  SECURITY_ALERTS: 'security_alerts',
  NEWSLETTER: 'newsletter'
}

class OnboardingService {
  constructor() {
    this.onboardingData = new Map()
    this.onboardingSteps = this.initializeOnboardingSteps()
    this.currentStep = ONBOARDING_STEPS.WELCOME
  }

  // Initialize onboarding steps configuration
  initializeOnboardingSteps() {
    return {
      [ONBOARDING_STEPS.WELCOME]: {
        id: ONBOARDING_STEPS.WELCOME,
        title: 'Welcome to Ojawa!',
        description: 'Let\'s get you started with your personalized experience',
        component: 'WelcomeStep',
        duration: 2000,
        required: true,
        nextStep: ONBOARDING_STEPS.PROFILE_SETUP
      },
      [ONBOARDING_STEPS.PROFILE_SETUP]: {
        id: ONBOARDING_STEPS.PROFILE_SETUP,
        title: 'Complete Your Profile',
        description: 'Help us personalize your experience',
        component: 'ProfileSetupStep',
        duration: 0,
        required: true,
        nextStep: ONBOARDING_STEPS.PREFERENCES
      },
      [ONBOARDING_STEPS.PREFERENCES]: {
        id: ONBOARDING_STEPS.PREFERENCES,
        title: 'Set Your Preferences',
        description: 'Tell us about your shopping preferences',
        component: 'PreferencesStep',
        duration: 0,
        required: true,
        nextStep: ONBOARDING_STEPS.INTERESTS
      },
      [ONBOARDING_STEPS.INTERESTS]: {
        id: ONBOARDING_STEPS.INTERESTS,
        title: 'Choose Your Interests',
        description: 'Select categories you\'re interested in',
        component: 'InterestsStep',
        duration: 0,
        required: false,
        nextStep: ONBOARDING_STEPS.WALLET_SETUP
      },
      [ONBOARDING_STEPS.WALLET_SETUP]: {
        id: ONBOARDING_STEPS.WALLET_SETUP,
        title: 'Set Up Your Wallet',
        description: 'Secure your payments with our wallet system',
        component: 'WalletSetupStep',
        duration: 0,
        required: true,
        nextStep: ONBOARDING_STEPS.NOTIFICATIONS
      },
      [ONBOARDING_STEPS.NOTIFICATIONS]: {
        id: ONBOARDING_STEPS.NOTIFICATIONS,
        title: 'Notification Preferences',
        description: 'Choose how you want to be notified',
        component: 'NotificationsStep',
        duration: 0,
        required: false,
        nextStep: ONBOARDING_STEPS.SECURITY
      },
      [ONBOARDING_STEPS.SECURITY]: {
        id: ONBOARDING_STEPS.SECURITY,
        title: 'Security Setup',
        description: 'Secure your account with additional settings',
        component: 'SecurityStep',
        duration: 0,
        required: false,
        nextStep: ONBOARDING_STEPS.COMPLETED
      },
      [ONBOARDING_STEPS.COMPLETED]: {
        id: ONBOARDING_STEPS.COMPLETED,
        title: 'All Set!',
        description: 'You\'re ready to start shopping on Ojawa',
        component: 'CompletedStep',
        duration: 3000,
        required: true,
        nextStep: null
      }
    }
  }

  // Start onboarding for a user
  startOnboarding(userId, userType = USER_TYPES.BUYER) {
    const onboardingData = {
      userId,
      userType,
      currentStep: ONBOARDING_STEPS.WELCOME,
      completedSteps: [],
      skippedSteps: [],
      data: {},
      startedAt: new Date(),
      completedAt: null,
      isCompleted: false
    }

    this.onboardingData.set(userId, onboardingData)
    this.currentStep = ONBOARDING_STEPS.WELCOME

    errorLogger.info('Onboarding started', { userId, userType })
    return onboardingData
  }

  // Get onboarding data for a user
  getOnboardingData(userId) {
    return this.onboardingData.get(userId) || null
  }

  // Update onboarding step data
  updateStepData(userId, stepId, data) {
    const onboardingData = this.getOnboardingData(userId)
    if (!onboardingData) return false

    onboardingData.data[stepId] = {
      ...onboardingData.data[stepId],
      ...data,
      updatedAt: new Date()
    }

    this.onboardingData.set(userId, onboardingData)
    return true
  }

  // Complete a step
  completeStep(userId, stepId) {
    const onboardingData = this.getOnboardingData(userId)
    if (!onboardingData) return false

    if (!onboardingData.completedSteps.includes(stepId)) {
      onboardingData.completedSteps.push(stepId)
    }

    // Move to next step
    const step = this.onboardingSteps[stepId]
    if (step && step.nextStep) {
      onboardingData.currentStep = step.nextStep
    }

    this.onboardingData.set(userId, onboardingData)

    errorLogger.info('Onboarding step completed', { userId, stepId })
    return true
  }

  // Skip a step
  skipStep(userId, stepId) {
    const onboardingData = this.getOnboardingData(userId)
    if (!onboardingData) return false

    if (!onboardingData.skippedSteps.includes(stepId)) {
      onboardingData.skippedSteps.push(stepId)
    }

    // Move to next step
    const step = this.onboardingSteps[stepId]
    if (step && step.nextStep) {
      onboardingData.currentStep = step.nextStep
    }

    this.onboardingData.set(userId, onboardingData)

    errorLogger.info('Onboarding step skipped', { userId, stepId })
    return true
  }

  // Complete onboarding
  completeOnboarding(userId) {
    const onboardingData = this.getOnboardingData(userId)
    if (!onboardingData) return false

    onboardingData.isCompleted = true
    onboardingData.completedAt = new Date()
    onboardingData.currentStep = ONBOARDING_STEPS.COMPLETED

    this.onboardingData.set(userId, onboardingData)

    errorLogger.info('Onboarding completed', { userId })
    return true
  }

  // Get current step for user
  getCurrentStep(userId) {
    const onboardingData = this.getOnboardingData(userId)
    if (!onboardingData) return null

    return this.onboardingSteps[onboardingData.currentStep]
  }

  // Get next step for user
  getNextStep(userId) {
    const onboardingData = this.getOnboardingData(userId)
    if (!onboardingData) return null

    const currentStep = this.onboardingSteps[onboardingData.currentStep]
    if (!currentStep || !currentStep.nextStep) return null

    return this.onboardingSteps[currentStep.nextStep]
  }

  // Get previous step for user
  getPreviousStep(userId) {
    const onboardingData = this.getOnboardingData(userId)
    if (!onboardingData) return null

    const currentStepId = onboardingData.currentStep
    const completedSteps = onboardingData.completedSteps

    // Find the last completed step
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const stepId = completedSteps[i]
      if (stepId !== currentStepId) {
        return this.onboardingSteps[stepId]
      }
    }

    return null
  }

  // Check if onboarding is completed
  isOnboardingCompleted(userId) {
    const onboardingData = this.getOnboardingData(userId)
    return onboardingData ? onboardingData.isCompleted : false
  }

  // Get onboarding progress
  getOnboardingProgress(userId) {
    const onboardingData = this.getOnboardingData(userId)
    if (!onboardingData) return { percentage: 0, completedSteps: 0, totalSteps: 0 }

    const totalSteps = Object.keys(this.onboardingSteps).length - 1 // Exclude completed step
    const completedSteps = onboardingData.completedSteps.length
    const percentage = Math.round((completedSteps / totalSteps) * 100)

    return {
      percentage,
      completedSteps,
      totalSteps,
      currentStep: onboardingData.currentStep
    }
  }

  // Reset onboarding for a user
  resetOnboarding(userId) {
    this.onboardingData.delete(userId)
    errorLogger.info('Onboarding reset', { userId })
    return true
  }

  // Get onboarding analytics
  getOnboardingAnalytics() {
    const analytics = {
      totalUsers: this.onboardingData.size,
      completedUsers: 0,
      inProgressUsers: 0,
      stepCompletionRates: {},
      averageCompletionTime: 0,
      commonSkipReasons: {}
    }

    let totalCompletionTime = 0
    let completedCount = 0

    for (const [userId, data] of this.onboardingData.entries()) {
      if (data.isCompleted) {
        analytics.completedUsers++
        completedCount++
        totalCompletionTime += new Date(data.completedAt) - new Date(data.startedAt)
      } else {
        analytics.inProgressUsers++
      }

      // Track step completion rates
      data.completedSteps.forEach(stepId => {
        analytics.stepCompletionRates[stepId] = (analytics.stepCompletionRates[stepId] || 0) + 1
      })
    }

    if (completedCount > 0) {
      analytics.averageCompletionTime = totalCompletionTime / completedCount
    }

    return analytics
  }

  // Validate onboarding data
  validateOnboardingData(userId, stepId, data) {
    const step = this.onboardingSteps[stepId]
    if (!step) return { isValid: false, errors: ['Invalid step'] }

    const errors = []

    switch (stepId) {
      case ONBOARDING_STEPS.PROFILE_SETUP:
        if (!data.firstName || data.firstName.trim().length < 2) {
          errors.push('First name must be at least 2 characters')
        }
        if (!data.lastName || data.lastName.trim().length < 2) {
          errors.push('Last name must be at least 2 characters')
        }
        if (!data.phone || !/^\+?[\d\s-()]+$/.test(data.phone)) {
          errors.push('Valid phone number is required')
        }
        break

      case ONBOARDING_STEPS.PREFERENCES:
        if (!data.currency || !['NGN', 'USD', 'EUR', 'GBP'].includes(data.currency)) {
          errors.push('Valid currency selection is required')
        }
        if (!data.language || !['en', 'fr', 'es', 'pt'].includes(data.language)) {
          errors.push('Valid language selection is required')
        }
        break

      case ONBOARDING_STEPS.INTERESTS:
        if (!data.interests || data.interests.length === 0) {
          errors.push('Please select at least one interest')
        }
        break

      case ONBOARDING_STEPS.WALLET_SETUP:
        if (!data.acceptedTerms) {
          errors.push('You must accept the terms and conditions')
        }
        break
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Get step data
  getStepData(userId, stepId) {
    const onboardingData = this.getOnboardingData(userId)
    if (!onboardingData) return null

    return onboardingData.data[stepId] || null
  }

  // Get all steps data
  getAllStepsData(userId) {
    const onboardingData = this.getOnboardingData(userId)
    if (!onboardingData) return {}

    return onboardingData.data
  }

  // Export onboarding data
  exportOnboardingData(userId) {
    const onboardingData = this.getOnboardingData(userId)
    if (!onboardingData) return null

    return {
      ...onboardingData,
      exportedAt: new Date()
    }
  }

  // Import onboarding data
  importOnboardingData(userId, data) {
    try {
      const onboardingData = {
        ...data,
        userId,
        importedAt: new Date()
      }

      this.onboardingData.set(userId, onboardingData)
      return true
    } catch (error) {
      errorLogger.error('Failed to import onboarding data', error)
      return false
    }
  }
}

// Export singleton instance
export const onboardingService = new OnboardingService()
export default onboardingService
