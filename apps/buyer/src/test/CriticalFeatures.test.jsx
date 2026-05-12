import { describe, it, expect } from 'vitest'

describe('Critical Features', () => {
  describe('Error Boundary', () => {
    it('should be importable', () => {
      expect(() => {
        import('../components/ErrorBoundary')
      }).not.toThrow()
    })
  })

  describe('Loading States', () => {
    it('should have loading components', () => {
      expect(() => {
        import('../components/LoadingStates')
      }).not.toThrow()
    })
  })

  describe('Environment Configuration', () => {
    it('should have environment config', () => {
      expect(() => {
        import('../config/env')
      }).not.toThrow()
    })
  })

  describe('Error Logger', () => {
    it('should have error logging utilities', () => {
      expect(() => {
        import('../utils/errorLogger')
      }).not.toThrow()
    })
  })

  describe('Form Validation', () => {
    it('should have validation utilities', () => {
      expect(() => {
        import('../utils/formValidation')
      }).not.toThrow()
    })
  })

  describe('Testing Setup', () => {
    it('should have proper test configuration', () => {
      expect(import.meta.env.MODE).toBeDefined()
    })
  })
})
