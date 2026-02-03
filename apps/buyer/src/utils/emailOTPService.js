/**
 * Email OTP Service
 * Handles One-Time Password generation, validation, and email delivery
 * Enhanced security with rate limiting and expiration
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import secureLocalStorage from './secureLocalStorage';
import secureNotification from './secureNotification';

class EmailOTPService {
  constructor() {
    this.otpLength = 6;
    this.otpExpiry = 10 * 60 * 1000; // 10 minutes
    this.maxAttempts = 5;
    this.cooldownPeriod = 5 * 60 * 1000; // 5 minutes
    this.functionName = 'sendEmailOTP';
    this.verifyFunctionName = 'verifyEmailOTP';
  }

  /**
   * Generate a secure random OTP
   */
  generateOTP() {
    const digits = '0123456789';
    let otp = '';
    
    // Use crypto API for secure random generation
    if (typeof window !== 'undefined' && window.crypto) {
      const array = new Uint32Array(this.otpLength);
      window.crypto.getRandomValues(array);
      
      for (let i = 0; i < this.otpLength; i++) {
        otp += digits[array[i] % digits.length];
      }
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < this.otpLength; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
      }
    }
    
    return otp;
  }

  /**
   * Store OTP securely with metadata
   */
  async storeOTP(email, otp, purpose = 'verification') {
    const otpData = {
      email: email.toLowerCase(),
      otp,
      purpose,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.otpExpiry,
      attempts: 0,
      lastAttempt: null
    };

    const key = `otp_${purpose}_${email.toLowerCase()}`;
    await secureLocalStorage.setItem(key, otpData);
    
    return otpData;
  }

  /**
   * Retrieve stored OTP data
   */
  async getOTPData(email, purpose = 'verification') {
    const key = `otp_${purpose}_${email.toLowerCase()}`;
    const otpData = await secureLocalStorage.getItem(key);
    
    if (!otpData) {
      return null;
    }

    // Check if OTP has expired
    if (Date.now() > otpData.expiresAt) {
      await secureLocalStorage.removeItem(key);
      return null;
    }

    return otpData;
  }

  /**
   * Send OTP via email
   */
  async sendOTP(email, purpose = 'verification', customMessage = null) {
    try {
      // Check rate limiting
      const rateLimitKey = `otp_rate_limit_${email.toLowerCase()}`;
      const lastSent = await secureLocalStorage.getItem(rateLimitKey);
      
      if (lastSent && (Date.now() - lastSent) < this.cooldownPeriod) {
        const remainingTime = Math.ceil((this.cooldownPeriod - (Date.now() - lastSent)) / 1000 / 60);
        throw new Error(`Please wait ${remainingTime} minutes before requesting another OTP.`);
      }

      // Generate and store OTP
      const otp = this.generateOTP();
      await this.storeOTP(email, otp, purpose);

      // Prepare email content
      const emailContent = this.prepareEmailContent(otp, purpose, customMessage);
      
      // Send OTP via Cloud Function
      const sendOTPFunction = httpsCallable(functions, this.functionName);
      const result = await sendOTPFunction({
        to: email,
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text,
        purpose: purpose
      });

      // Update rate limit
      await secureLocalStorage.setItem(rateLimitKey, Date.now());

      // Store metadata for tracking
      const metadataKey = `otp_meta_${purpose}_${email.toLowerCase()}`;
      await secureLocalStorage.setItem(metadataKey, {
        sentAt: Date.now(),
        purpose,
        email: email.toLowerCase()
      });

      return {
        success: true,
        message: `OTP sent to ${email}`,
        expiresAt: Date.now() + this.otpExpiry,
        requestId: result.data?.requestId
      };

    } catch (error) {
      console.error('OTP send error:', error);
      
      // Handle specific error cases
      if (error.message.includes('rate limit')) {
        throw error;
      }
      
      throw new Error('Failed to send OTP. Please try again.');
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email, otp, purpose = 'verification') {
    try {
      const otpData = await this.getOTPData(email, purpose);
      
      if (!otpData) {
        throw new Error('OTP not found or has expired. Please request a new one.');
      }

      // Check attempts limit
      if (otpData.attempts >= this.maxAttempts) {
        await this.clearOTP(email, purpose);
        throw new Error('Too many failed attempts. Please request a new OTP.');
      }

      // Update attempt count
      otpData.attempts++;
      otpData.lastAttempt = Date.now();
      const key = `otp_${purpose}_${email.toLowerCase()}`;
      await secureLocalStorage.setItem(key, otpData);

      // Verify OTP
      if (otpData.otp !== otp) {
        const remainingAttempts = this.maxAttempts - otpData.attempts;
        throw new Error(`Invalid OTP. ${remainingAttempts} attempts remaining.`);
      }

      // OTP is valid - clear it
      await this.clearOTP(email, purpose);

      // Verify via Cloud Function for additional security
      const verifyOTPFunction = httpsCallable(functions, this.verifyFunctionName);
      const result = await verifyOTPFunction({
        email,
        otp,
        purpose,
        timestamp: Date.now()
      });

      return {
        success: true,
        message: 'OTP verified successfully',
        verifiedAt: Date.now(),
        serverVerified: result.data?.verified || false
      };

    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  }

  /**
   * Clear OTP data
   */
  async clearOTP(email, purpose = 'verification') {
    const key = `otp_${purpose}_${email.toLowerCase()}`;
    await secureLocalStorage.removeItem(key);
  }

  /**
   * Check if OTP exists and is valid
   */
  async checkOTPStatus(email, purpose = 'verification') {
    const otpData = await this.getOTPData(email, purpose);
    
    if (!otpData) {
      return {
        exists: false,
        expired: false,
        remainingTime: 0,
        attempts: 0,
        maxAttempts: this.maxAttempts
      };
    }

    const remainingTime = Math.max(0, otpData.expiresAt - Date.now());
    
    return {
      exists: true,
      expired: remainingTime === 0,
      remainingTime,
      attempts: otpData.attempts,
      maxAttempts: this.maxAttempts,
      createdAt: otpData.createdAt
    };
  }

  /**
   * Prepare email content
   */
  prepareEmailContent(otp, purpose, customMessage = null) {
    const expiryMinutes = Math.ceil(this.otpExpiry / 1000 / 60);
    
    const subjects = {
      verification: 'Verify Your Email Address',
      login: 'Login Verification Code',
      password_reset: 'Password Reset Code',
      transaction: 'Transaction Verification Code'
    };

    const subject = customMessage?.subject || subjects[purpose] || 'Verification Code';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp { font-size: 32px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; letter-spacing: 5px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Ojawa E-commerce</h1>
            <p>Secure Verification</p>
          </div>
          <div class="content">
            <h2>Your Verification Code</h2>
            <p>Use the following code to complete your ${purpose.replace('_', ' ')}:</p>
            <div class="otp">${otp}</div>
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This code will expire in ${expiryMinutes} minutes</li>
                <li>Never share this code with anyone</li>
                <li>We will never ask for your password via email</li>
              </ul>
            </div>
            <p>If you didn't request this code, please ignore this email or contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 Ojawa E-commerce. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      OJAWA E-COMMERCE - VERIFICATION CODE
      
      Your verification code is: ${otp}
      
      This code will expire in ${expiryMinutes} minutes.
      
      Important:
      - Never share this code with anyone
      - We will never ask for your password via email
      - If you didn't request this code, please ignore this email
      
      © 2024 Ojawa E-commerce. All rights reserved.
    `;

    return { subject, htmlContent, textContent };
  }

  /**
   * Resend OTP
   */
  async resendOTP(email, purpose = 'verification') {
    // Clear existing OTP first
    await this.clearOTP(email, purpose);
    
    // Send new OTP
    return await this.sendOTP(email, purpose);
  }

  /**
   * Clean up expired OTPs
   */
  async cleanupExpiredOTPs() {
    try {
      const keys = secureLocalStorage.getKeys();
      const otpKeys = keys.filter(key => key.startsWith('otp_'));
      let cleaned = 0;

      for (const key of otpKeys) {
        const otpData = await secureLocalStorage.getItem(key);
        if (otpData && Date.now() > otpData.expiresAt) {
          await secureLocalStorage.removeItem(key);
          cleaned++;
        }
      }

      return cleaned;
    } catch (error) {
      console.error('OTP cleanup error:', error);
      return 0;
    }
  }

  /**
   * Get OTP statistics
   */
  async getOTPStats() {
    try {
      const keys = secureLocalStorage.getKeys();
      const otpKeys = keys.filter(key => key.startsWith('otp_'));
      
      let activeOTPs = 0;
      let expiredOTPs = 0;
      
      for (const key of otpKeys) {
        const otpData = await secureLocalStorage.getItem(key);
        if (otpData) {
          if (Date.now() > otpData.expiresAt) {
            expiredOTPs++;
          } else {
            activeOTPs++;
          }
        }
      }

      return {
        activeOTPs,
        expiredOTPs,
        totalKeys: otpKeys.length
      };
    } catch (error) {
      console.error('OTP stats error:', error);
      return { activeOTPs: 0, expiredOTPs: 0, totalKeys: 0 };
    }
  }
}

// Create singleton instance
const emailOTPService = new EmailOTPService();

// Auto-cleanup expired OTPs every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    emailOTPService.cleanupExpiredOTPs();
  }, 5 * 60 * 1000);
}

export default emailOTPService;
