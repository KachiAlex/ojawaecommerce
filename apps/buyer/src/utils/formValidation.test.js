import { describe, it, expect } from 'vitest'
import { validators, commonRules } from './formValidation'

describe('formValidation', () => {
  describe('validators.required', () => {
    it('returns error for empty string', () => {
      expect(validators.required('')).toBe('This field is required')
    })

    it('returns error for whitespace only', () => {
      expect(validators.required('   ')).toBe('This field is required')
    })

    it('returns error for null', () => {
      expect(validators.required(null)).toBe('This field is required')
    })

    it('returns error for undefined', () => {
      expect(validators.required(undefined)).toBe('This field is required')
    })

    it('returns null for valid value', () => {
      expect(validators.required('test')).toBe(null)
      expect(validators.required('test value')).toBe(null)
    })
  })

  describe('validators.email', () => {
    it('returns null for empty value (not required)', () => {
      expect(validators.email('')).toBe(null)
    })

    it('returns error for invalid email', () => {
      expect(validators.email('invalid')).toBe('Please enter a valid email address')
      expect(validators.email('invalid@')).toBe('Please enter a valid email address')
      expect(validators.email('@invalid.com')).toBe('Please enter a valid email address')
      expect(validators.email('invalid@.com')).toBe('Please enter a valid email address')
    })

    it('returns null for valid email', () => {
      expect(validators.email('test@example.com')).toBe(null)
      expect(validators.email('user.name@example.co.uk')).toBe(null)
      expect(validators.email('test+tag@example.com')).toBe(null)
    })
  })

  describe('validators.password', () => {
    it('returns null for empty value (not required)', () => {
      expect(validators.password('')).toBe(null)
    })

    it('returns error for short password', () => {
      expect(validators.password('short')).toBe('Password must be at least 8 characters long')
    })

    it('returns error for password without lowercase', () => {
      expect(validators.password('PASSWORD123')).toBe('Password must contain at least one lowercase letter')
    })

    it('returns error for password without uppercase', () => {
      expect(validators.password('password123')).toBe('Password must contain at least one uppercase letter')
    })

    it('returns error for password without number', () => {
      expect(validators.password('Password')).toBe('Password must contain at least one number')
    })

    it('returns null for valid password', () => {
      expect(validators.password('Password123')).toBe(null)
      expect(validators.password('MyP@ssw0rd')).toBe(null)
    })
  })

  describe('validators.phone', () => {
    it('returns null for empty value (not required)', () => {
      expect(validators.phone('')).toBe(null)
    })

    it('returns error for invalid phone numbers', () => {
      expect(validators.phone('abc')).toBe('Please enter a valid phone number')
      // Note: '123' might pass the regex if it starts with 1-9, so we test with clearly invalid
      expect(validators.phone('0123')).toBe('Please enter a valid phone number') // Starts with 0
      // Note: '+123' might pass the regex (starts with +, then 1-9, then digits), so test with clearly invalid
      expect(validators.phone('+0')).toBe('Please enter a valid phone number') // Starts with +0
    })

    it('returns null for valid phone numbers', () => {
      expect(validators.phone('+2348012345678')).toBe(null)
      // Note: Phone validator requires starting with 1-9, so '080...' won't pass
      expect(validators.phone('2348012345678')).toBe(null) // Without leading 0
      expect(validators.phone('+1234567890123')).toBe(null) // US format
    })

    it('handles formatted phone numbers', () => {
      expect(validators.phone('+234 801 234 5678')).toBe(null) // Spaces removed
      expect(validators.phone('2348012345678')).toBe(null) // Without formatting
    })
  })

  describe('validators.minLength', () => {
    it('returns null for empty value', () => {
      const validator = validators.minLength(5)
      expect(validator('')).toBe(null)
    })

    it('returns error for string shorter than minimum', () => {
      const validator = validators.minLength(5)
      expect(validator('abc')).toBe('Must be at least 5 characters long')
      expect(validator('ab')).toBe('Must be at least 5 characters long')
    })

    it('returns null for string meeting minimum length', () => {
      const validator = validators.minLength(5)
      expect(validator('abcde')).toBe(null)
      expect(validator('abcdef')).toBe(null)
    })
  })

  describe('validators.maxLength', () => {
    it('returns null for empty value', () => {
      const validator = validators.maxLength(10)
      expect(validator('')).toBe(null)
    })

    it('returns error for string longer than maximum', () => {
      const validator = validators.maxLength(5)
      expect(validator('abcdef')).toBe('Must be no more than 5 characters long')
    })

    it('returns null for string within maximum length', () => {
      const validator = validators.maxLength(10)
      expect(validator('abc')).toBe(null)
      expect(validator('abcdefghij')).toBe(null)
    })
  })

  describe('validators.numeric', () => {
    it('returns null for empty value', () => {
      expect(validators.numeric('')).toBe(null)
    })

    it('returns error for non-numeric values', () => {
      expect(validators.numeric('abc')).toBe('Must be a valid number')
      expect(validators.numeric('12abc')).toBe('Must be a valid number')
    })

    it('returns null for numeric values', () => {
      expect(validators.numeric('123')).toBe(null)
      expect(validators.numeric('123.45')).toBe(null)
      expect(validators.numeric('-123')).toBe(null)
    })
  })

  describe('validators.positive', () => {
    it('returns null for empty value', () => {
      expect(validators.positive('')).toBe(null)
    })

    it('returns error for zero or negative', () => {
      expect(validators.positive('0')).toBe('Must be a positive number')
      expect(validators.positive('-1')).toBe('Must be a positive number')
      expect(validators.positive('-123.45')).toBe('Must be a positive number')
    })

    it('returns null for positive numbers', () => {
      expect(validators.positive('1')).toBe(null)
      expect(validators.positive('123.45')).toBe(null)
    })
  })

  describe('validators.url', () => {
    it('returns null for empty value', () => {
      expect(validators.url('')).toBe(null)
    })

    it('returns error for invalid URLs', () => {
      expect(validators.url('not a url')).toBe('Please enter a valid URL')
      expect(validators.url('http://')).toBe('Please enter a valid URL')
      expect(validators.url('example.com')).toBe('Please enter a valid URL')
    })

    it('returns null for valid URLs', () => {
      expect(validators.url('https://example.com')).toBe(null)
      expect(validators.url('http://example.com')).toBe(null)
      expect(validators.url('https://www.example.com/path?query=value')).toBe(null)
    })
  })

  describe('validators.confirmPassword', () => {
    it('returns null for empty value', () => {
      const validator = validators.confirmPassword('password123')
      expect(validator('')).toBe(null)
    })

    it('returns error when passwords do not match', () => {
      const validator = validators.confirmPassword('password123')
      expect(validator('password456')).toBe('Passwords do not match')
    })

    it('returns null when passwords match', () => {
      const validator = validators.confirmPassword('password123')
      expect(validator('password123')).toBe(null)
    })
  })

  describe('validators.age', () => {
    it('returns null for empty value', () => {
      const validator = validators.age(18)
      expect(validator('')).toBe(null)
    })

    it('returns error for age below minimum', () => {
      const validator = validators.age(18)
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 17) // 17 years old
      expect(validator(birthDate.toISOString().split('T')[0])).toBe('You must be at least 18 years old')
    })

    it('returns null for age meeting minimum', () => {
      const validator = validators.age(18)
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 20) // 20 years old
      expect(validator(birthDate.toISOString().split('T')[0])).toBe(null)
    })
  })

  describe('commonRules', () => {
    it('email rule includes required and email validators', () => {
      expect(commonRules.email).toContain(validators.required)
      expect(commonRules.email).toContain(validators.email)
    })

    it('password rule includes required and password validators', () => {
      expect(commonRules.password).toContain(validators.required)
      expect(commonRules.password).toContain(validators.password)
    })

    it('phone rule includes required and phone validators', () => {
      expect(commonRules.phone).toContain(validators.required)
      expect(commonRules.phone).toContain(validators.phone)
    })

    it('price rule includes required, numeric, and positive validators', () => {
      expect(commonRules.price).toContain(validators.required)
      expect(commonRules.price).toContain(validators.numeric)
      expect(commonRules.price).toContain(validators.positive)
    })
  })
})

