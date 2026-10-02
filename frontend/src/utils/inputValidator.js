/**
 * Input Validation and Sanitization Utility
 * Prevents XSS attacks and validates user input
 */

class InputValidator {
  // XSS prevention patterns
  static xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]*src[^>]*javascript:/gi,
    /<[^>]*on\w+\s*=[^>]*>/gi,
    /<[^>]*style[^>]*expression\s*\(/gi,
    /&#\d+;/gi,
    /&\w+;/gi
  ];

  // SQL injection patterns
  static sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
    /(\b(OR|AND)\b\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/gi,
    /(--|;|\/\*|\*\/|xp_|sp_)/gi
  ];

  // Email validation regex
  static emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Phone validation regex (Nigeria and international)
  static phoneRegex = /^(\+?\d{1,3}[- ]?)?\d{10,15}$/;

  // Name validation (letters, spaces, hyphens, apostrophes)
  static nameRegex = /^[a-zA-Z\s\-'\u00C0-\u017F]+$/;

  // Address validation
  static addressRegex = /^[a-zA-Z0-9\s\-\.,#\/\u00C0-\u017F]+$/;

  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input) {
    if (typeof input !== 'string') return '';
    
    let sanitized = input;
    
    // Remove XSS patterns
    this.xssPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    // HTML entity encoding
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
    
    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    return sanitized.trim();
  }

  /**
   * Validate and sanitize email
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return { valid: false, message: 'Email is required' };
    
    const sanitized = this.sanitizeString(email.trim());
    
    if (!this.emailRegex.test(sanitized)) {
      return { valid: false, message: 'Please enter a valid email address' };
    }
    
    // Additional checks
    if (sanitized.length > 254) {
      return { valid: false, message: 'Email address is too long' };
    }
    
    return { valid: true, sanitized };
  }

  /**
   * Validate and sanitize phone number
   */
  static validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return { valid: false, message: 'Phone number is required' };
    
    const sanitized = this.sanitizeString(phone.trim());
    
    if (!this.phoneRegex.test(sanitized)) {
      return { valid: false, message: 'Please enter a valid phone number' };
    }
    
    return { valid: true, sanitized };
  }

  /**
   * Validate and sanitize name
   */
  static validateName(name, fieldName = 'Name') {
    if (!name || typeof name !== 'string') return { valid: false, message: `${fieldName} is required` };
    
    const sanitized = this.sanitizeString(name.trim());
    
    if (!this.nameRegex.test(sanitized)) {
      return { valid: false, message: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
    }
    
    if (sanitized.length < 2) {
      return { valid: false, message: `${fieldName} must be at least 2 characters long` };
    }
    
    if (sanized.length > 50) {
      return { valid: false, message: `${fieldName} is too long` };
    }
    
    return { valid: true, sanitized };
  }

  /**
   * Validate and sanitize address
   */
  static validateAddress(address, fieldName = 'Address') {
    if (!address || typeof address !== 'string') return { valid: false, message: `${fieldName} is required` };
    
    const sanitized = this.sanitizeString(address.trim());
    
    if (!this.addressRegex.test(sanitized)) {
      return { valid: false, message: `${fieldName} contains invalid characters` };
    }
    
    if (sanitized.length < 5) {
      return { valid: false, message: `${fieldName} must be at least 5 characters long` };
    }
    
    if (sanitized.length > 200) {
      return { valid: false, message: `${fieldName} is too long` };
    }
    
    return { valid: true, sanitized };
  }

  /**
   * Validate numeric input
   */
  static validateNumber(value, options = {}) {
    const {
      min = 0,
      max = Infinity,
      integer = false,
      required = true,
      fieldName = 'Value'
    } = options;

    if (required && (value === null || value === undefined || value === '')) {
      return { valid: false, message: `${fieldName} is required` };
    }

    if (!required && (value === null || value === undefined || value === '')) {
      return { valid: true, sanitized: null };
    }

    const num = Number(value);
    
    if (isNaN(num)) {
      return { valid: false, message: `${fieldName} must be a valid number` };
    }
    
    if (integer && !Number.isInteger(num)) {
      return { valid: false, message: `${fieldName} must be a whole number` };
    }
    
    if (num < min) {
      return { valid: false, message: `${fieldName} must be at least ${min}` };
    }
    
    if (num > max) {
      return { valid: false, message: `${fieldName} must not exceed ${max}` };
    }
    
    return { valid: true, sanitized: num };
  }

  /**
   * Validate text input with custom options
   */
  static validateText(value, options = {}) {
    const {
      minLength = 1,
      maxLength = 1000,
      required = true,
      fieldName = 'Text',
      allowEmpty = false
    } = options;

    if (required && !value && !allowEmpty) {
      return { valid: false, message: `${fieldName} is required` };
    }

    if (!required && !value) {
      return { valid: true, sanitized: '' };
    }

    const sanitized = this.sanitizeString(value.trim());
    
    if (sanitized.length < minLength) {
      return { valid: false, message: `${fieldName} must be at least ${minLength} characters long` };
    }
    
    if (sanitized.length > maxLength) {
      return { valid: false, message: `${fieldName} must not exceed ${maxLength} characters` };
    }
    
    return { valid: true, sanitized };
  }

  /**
   * Validate form data object
   */
  static validateForm(formData, validationRules) {
    const errors = {};
    const sanitizedData = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(validationRules)) {
      const value = formData[field];
      let result;

      try {
        switch (rules.type) {
          case 'email':
            result = this.validateEmail(value);
            break;
          case 'phone':
            result = this.validatePhone(value);
            break;
          case 'name':
            result = this.validateName(value, rules.fieldName);
            break;
          case 'address':
            result = this.validateAddress(value, rules.fieldName);
            break;
          case 'number':
            result = this.validateNumber(value, rules);
            break;
          case 'text':
            result = this.validateText(value, rules);
            break;
          default:
            result = this.validateText(value, rules);
        }

        if (result.valid) {
          sanitizedData[field] = result.sanitized || value;
        } else {
          errors[field] = result.message;
          isValid = false;
        }
      } catch (error) {
        errors[field] = `Validation error: ${error.message}`;
        isValid = false;
      }
    }

    return { isValid, errors, sanitizedData };
  }

  /**
   * Check for SQL injection patterns
   */
  static containsSqlInjection(input) {
    if (typeof input !== 'string') return false;
    
    return this.sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate search query (more permissive but still safe)
   */
  static validateSearchQuery(query) {
    if (!query || typeof query !== 'string') return { valid: true, sanitized: '' };
    
    const sanitized = this.sanitizeString(query.trim());
    
    if (this.containsSqlInjection(sanitized)) {
      return { valid: false, message: 'Invalid search query' };
    }
    
    if (sanitized.length > 200) {
      return { valid: false, message: 'Search query is too long' };
    }
    
    return { valid: true, sanitized };
  }
}

export default InputValidator;
