import React, { useState } from 'react'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { useFormValidation, commonRules } from '../../utils/formValidation'

const ProfileSetupStep = () => {
  const { completeStep, currentStep, progress, getStepData } = useOnboarding()
  const [isLoading, setIsLoading] = useState(false)

  // Initialize form with existing data or defaults
  const existingData = getStepData(currentStep.id) || {}
  
  const { values, errors, handleChange, handleBlur, validateForm, getFieldProps } = useFormValidation(
    {
      firstName: existingData.firstName || '',
      lastName: existingData.lastName || '',
      phone: existingData.phone || '',
      dateOfBirth: existingData.dateOfBirth || '',
      gender: existingData.gender || '',
      location: existingData.location || ''
    },
    {
      firstName: [commonRules.required, commonRules.min(2)],
      lastName: [commonRules.required, commonRules.min(2)],
      phone: [commonRules.required, commonRules.phone],
      dateOfBirth: [commonRules.required],
      gender: [commonRules.required],
      location: [commonRules.required]
    }
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      const success = await completeStep(currentStep.id, values)
      if (!success) {
        console.error('Failed to complete step')
      }
    } catch (error) {
      console.error('Error completing step:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">👤</span>
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

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Complete Your Profile
            </h1>
            <p className="text-gray-600">
              Help us personalize your shopping experience
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  {...getFieldProps('firstName')}
                  type="text"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  {...getFieldProps('lastName')}
                  type="text"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                {...getFieldProps('phone')}
                type="tel"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+234 800 000 0000"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Date of Birth and Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  {...getFieldProps('dateOfBirth')}
                  type="date"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
                )}
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender *
                </label>
                <select
                  {...getFieldProps('gender')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    errors.gender ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <select
                {...getFieldProps('location')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  errors.location ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select your country</option>
                <option value="nigeria">Nigeria</option>
                <option value="ghana">Ghana</option>
                <option value="kenya">Kenya</option>
                <option value="south-africa">South Africa</option>
                <option value="egypt">Egypt</option>
                <option value="morocco">Morocco</option>
                <option value="other">Other</option>
              </select>
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </form>

          {/* Privacy Notice */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              🔒 Your information is secure and will only be used to personalize your experience
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileSetupStep
