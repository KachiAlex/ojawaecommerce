import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  getCurrencySymbol,
  convertCurrency,
  detectCurrency,
  isValidCurrency,
  getAllCurrencies,
  getDualCurrencyDisplay,
} from './currencyUtils'

describe('currencyUtils', () => {
  describe('formatCurrency', () => {
    it('formats NGN currency correctly', () => {
      expect(formatCurrency(10000, 'NGN')).toBe('₦ 10,000')
      expect(formatCurrency(1000, 'NGN')).toBe('₦ 1,000')
      expect(formatCurrency(100, 'NGN')).toBe('₦ 100')
    })

    it('formats USD currency correctly', () => {
      expect(formatCurrency(100, 'USD')).toBe('$ 100')
    })

    it('formats EUR currency correctly', () => {
      expect(formatCurrency(100, 'EUR')).toBe('€ 100')
    })

    it('formats GBP currency correctly', () => {
      expect(formatCurrency(100, 'GBP')).toBe('£ 100')
    })

    it('handles zero and negative values', () => {
      expect(formatCurrency(0, 'NGN')).toBe('₦ 0')
      expect(formatCurrency(-100, 'NGN')).toBe('₦ -100')
    })

    it('handles large numbers with commas', () => {
      expect(formatCurrency(1000000, 'NGN')).toBe('₦ 1,000,000')
      expect(formatCurrency(1234567, 'NGN')).toBe('₦ 1,234,567')
    })

    it('defaults to NGN when currency not specified', () => {
      expect(formatCurrency(10000)).toBe('₦ 10,000')
    })
  })

  describe('getCurrencySymbol', () => {
    it('returns correct symbol for NGN', () => {
      expect(getCurrencySymbol('NGN')).toBe('₦')
    })

    it('returns correct symbol for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$')
    })

    it('returns correct symbol for EUR', () => {
      expect(getCurrencySymbol('EUR')).toBe('€')
    })

    it('returns default symbol for unknown currency', () => {
      expect(getCurrencySymbol('UNKNOWN')).toBe('₦')
    })
  })

  describe('convertCurrency', () => {
    it('returns same amount when currencies are the same', () => {
      expect(convertCurrency(1000, 'NGN', 'NGN')).toBe(1000)
    })

    it('converts USD to NGN correctly', () => {
      // 1 USD ≈ 1650 NGN
      const result = convertCurrency(1, 'USD', 'NGN')
      expect(result).toBeCloseTo(1650, 0)
    })

    it('converts NGN to USD correctly', () => {
      // 1650 NGN ≈ 1 USD
      const result = convertCurrency(1650, 'NGN', 'USD')
      expect(result).toBeCloseTo(1, 0)
    })

    it('converts EUR to NGN correctly', () => {
      // 1 EUR ≈ 1800 NGN
      const result = convertCurrency(1, 'EUR', 'NGN')
      expect(result).toBeCloseTo(1800, 0)
    })

    it('converts between non-NGN currencies', () => {
      // Convert USD to EUR via NGN
      const result = convertCurrency(1, 'USD', 'EUR')
      // 1 USD = 1650 NGN, 1650 NGN = 1650/1800 EUR ≈ 0.92 EUR
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(1) // Can be exactly 1 due to rounding
    })

    it('rounds to nearest integer', () => {
      const result = convertCurrency(1, 'USD', 'NGN')
      expect(Number.isInteger(result)).toBe(true)
    })
  })

  describe('detectCurrency', () => {
    it('detects NGN for Nigeria', () => {
      expect(detectCurrency('Nigeria')).toBe('NGN')
    })

    it('detects GHS for Ghana', () => {
      expect(detectCurrency('Ghana')).toBe('GHS')
    })

    it('detects KES for Kenya', () => {
      expect(detectCurrency('Kenya')).toBe('KES')
    })

    it('defaults to NGN for unknown country', () => {
      expect(detectCurrency('Unknown Country')).toBe('NGN')
    })
  })

  describe('isValidCurrency', () => {
    it('returns true for valid currency codes', () => {
      expect(isValidCurrency('NGN')).toBe(true)
      expect(isValidCurrency('USD')).toBe(true)
      expect(isValidCurrency('EUR')).toBe(true)
      expect(isValidCurrency('GBP')).toBe(true)
    })

    it('returns false for invalid currency codes', () => {
      expect(isValidCurrency('INVALID')).toBe(false)
      expect(isValidCurrency('')).toBe(false)
      expect(isValidCurrency('XYZ')).toBe(false)
    })
  })

  describe('getAllCurrencies', () => {
    it('returns array of all currencies', () => {
      const currencies = getAllCurrencies()
      expect(Array.isArray(currencies)).toBe(true)
      expect(currencies.length).toBeGreaterThan(0)
    })

    it('each currency has required properties', () => {
      const currencies = getAllCurrencies()
      currencies.forEach(currency => {
        expect(currency).toHaveProperty('code')
        expect(currency).toHaveProperty('symbol')
        expect(currency).toHaveProperty('name')
        expect(currency).toHaveProperty('display')
      })
    })

    it('includes major currencies', () => {
      const currencies = getAllCurrencies()
      const codes = currencies.map(c => c.code)
      expect(codes).toContain('NGN')
      expect(codes).toContain('USD')
      expect(codes).toContain('EUR')
    })
  })

  describe('getDualCurrencyDisplay', () => {
    it('returns null for NGN currency', () => {
      expect(getDualCurrencyDisplay(1000, 'NGN')).toBe(null)
    })

    it('returns dual display for non-NGN currency', () => {
      const result = getDualCurrencyDisplay(100, 'USD')
      expect(result).not.toBe(null)
      expect(result).toHaveProperty('original')
      expect(result).toHaveProperty('ngn')
      expect(result).toHaveProperty('text')
    })

    it('includes NGN equivalent in display', () => {
      const result = getDualCurrencyDisplay(1, 'USD')
      expect(result.ngn).toContain('₦')
      expect(result.text).toContain('₦')
    })

    it('formats both currencies correctly', () => {
      const result = getDualCurrencyDisplay(100, 'USD')
      expect(result.original).toContain('$')
      expect(result.ngn).toContain('₦')
    })
  })
})

