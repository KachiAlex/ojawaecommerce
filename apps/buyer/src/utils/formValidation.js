// Form validation utilities
export const validators = {
  // Required field validation
  required: (value) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'This field is required'
    }
    return null
  },

  // Email validation
  email: (value) => {
    if (!value) return null // Allow empty if not required
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address'
    }
    return null
  },

  // Password validation
  password: (value) => {
    if (!value) return null
    if (value.length < 8) {
      return 'Password must be at least 8 characters long'
    }
    if (!/(?=.*[a-z])/.test(value)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/(?=.*[A-Z])/.test(value)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/(?=.*\d)/.test(value)) {
      return 'Password must contain at least one number'
    }
    return null
  },

  // Phone number validation (international format)
  phone: (value) => {
    if (!value) return null
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
      return 'Please enter a valid phone number'
    }
    return null
  },

  // Minimum length validation
  minLength: (min) => (value) => {
    if (!value) return null
    if (value.length < min) {
      return `Must be at least ${min} characters long`
    }
    return null
  },

  // Maximum length validation
  maxLength: (max) => (value) => {
    if (!value) return null
    if (value.length > max) {
      return `Must be no more than ${max} characters long`
    }
    return null
  },

  // Numeric validation
  numeric: (value) => {
    if (!value) return null
    if (isNaN(value) || isNaN(parseFloat(value))) {
      return 'Must be a valid number'
    }
    return null
  },

  // Positive number validation
  positive: (value) => {
    if (!value) return null
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) {
      return 'Must be a positive number'
    }
    return null
  },

  // URL validation
  url: (value) => {
    if (!value) return null
    try {
      new URL(value)
      return null
    } catch {
      return 'Please enter a valid URL'
    }
  },

  // Custom validation function
  custom: (validatorFn, message) => (value) => {
    if (!value) return null
    if (!validatorFn(value)) {
      return message
    }
    return null
  },

  // Confirm password validation
  confirmPassword: (password) => (value) => {
    if (!value) return null
    if (value !== password) {
      return 'Passwords do not match'
    }
    return null
  },

  // Age validation
  age: (minAge = 13) => (value) => {
    if (!value) return null
    const birthDate = new Date(value)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    if (age < minAge) {
      return `You must be at least ${minAge} years old`
    }
    return null
  }
}

// Form validation hook
export const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = React.useState(initialValues)
  const [errors, setErrors] = React.useState({})
  const [touched, setTouched] = React.useState({})

  const validateField = (name, value) => {
    const rules = validationRules[name] || []
    const fieldErrors = rules
      .map(rule => {
        if (typeof rule === 'function') {
          return rule(value)
        }
        return null
      })
      .filter(error => error !== null)
    
    return fieldErrors.length > 0 ? fieldErrors[0] : null
  }

  const validateForm = () => {
    const newErrors = {}
    let isValid = true

    Object.keys(validationRules).forEach(name => {
      const error = validateField(name, values[name])
      if (error) {
        newErrors[name] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const handleChange = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    
    // Validate field on blur
    const error = validateField(name, values[name])
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const resetForm = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }

  const getFieldProps = (name) => ({
    value: values[name] || '',
    onChange: (e) => handleChange(name, e.target.value),
    onBlur: () => handleBlur(name),
    error: touched[name] ? errors[name] : null,
    touched: touched[name]
  })

  return {
    values,
    errors,
    touched,
    isValid: Object.keys(errors).length === 0,
    validateForm,
    handleChange,
    handleBlur,
    resetForm,
    getFieldProps,
    setValues,
    setErrors,
    setTouched
  }
}

// Common validation rules
export const commonRules = {
  email: [validators.required, validators.email],
  password: [validators.required, validators.password],
  phone: [validators.required, validators.phone],
  name: [validators.required, validators.minLength(2)],
  address: [validators.required, validators.minLength(10)],
  price: [validators.required, validators.numeric, validators.positive],
  quantity: [validators.required, validators.numeric, validators.positive],
  url: [validators.url],
  requiredText: [validators.required, validators.minLength(3)],
  optionalEmail: [validators.email],
  optionalPhone: [validators.phone],
}

// Form field component props helper
export const getFormFieldProps = (name, formProps) => ({
  ...formProps.getFieldProps(name),
  name,
  id: name,
  className: `block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 ${
    formProps.errors[name] && formProps.touched[name]
      ? 'border-red-300'
      : 'border-gray-300'
  }`,
})

// Error message component props helper
export const getErrorMessageProps = (name, formProps) => ({
  className: 'mt-1 text-sm text-red-600',
  children: formProps.errors[name] && formProps.touched[name] ? formProps.errors[name] : null
})
