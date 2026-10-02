/**
 * Sendchamp Email Service
 * Handles email sending via Sendchamp API
 */

const axios = require('axios');

const SENDCHAMP_BASE_URL = process.env.SENDCHAMP_BASE_URL || 'https://api.sendchamp.com/api/v1';
const SENDCHAMP_API_KEY = process.env.SENDCHAMP_API_KEY;

/**
 * Send email via Sendchamp
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlContent - HTML email content
 * @param {string} options.textContent - Plain text email content
 * @param {string} options.senderName - Sender name (default: Ojawa E-commerce)
 * @param {string} options.senderEmail - Sender email (default: noreply@ojawa-ecommerce.com)
 * @returns {Promise<Object>} Sendchamp API response
 */
async function sendEmail(options) {
  const {
    to,
    subject,
    htmlContent,
    textContent,
    senderName = 'Ojawa E-commerce',
    senderEmail = 'noreply@ojawa-ecommerce.com'
  } = options;

  if (!SENDCHAMP_API_KEY) {
    console.warn('⚠️ Sendchamp API key not configured - email will not be sent');
    return {
      success: false,
      message: 'Sendchamp API key not configured',
      simulated: true
    };
  }

  try {
    console.log('📧 Sending email via Sendchamp:', {
      to,
      subject,
      sender: `${senderName} <${senderEmail}>`
    });

    const response = await axios.post(
      `${SENDCHAMP_BASE_URL}/email/send`,
      {
        to: [to],
        sender_name: senderName,
        sender_email: senderEmail,
        subject,
        message_type: 'html',
        html_body: htmlContent,
        text_body: textContent || htmlContent.replace(/<[^>]*>/g, '')
      },
      {
        headers: {
          'Authorization': `Bearer ${SENDCHAMP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Sendchamp email sent successfully:', response.data);
    return {
      success: true,
      message: 'Email sent successfully',
      data: response.data
    };
  } catch (error) {
    console.error('❌ Sendchamp email failed:', error.response?.data || error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Send OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} purpose - Purpose of OTP (verification, login, password_reset)
 * @param {number} expiryMinutes - OTP expiry time in minutes
 * @returns {Promise<Object>} Sendchamp API response
 */
async function sendOTPEmail(email, otp, purpose = 'verification', expiryMinutes = 10) {
  const subjects = {
    verification: 'Verify Your Email Address',
    login: 'Login Verification Code',
    password_reset: 'Password Reset Code',
    transaction: 'Transaction Verification Code'
  };

  const subject = subjects[purpose] || 'Verification Code';

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

  return sendEmail({
    to: email,
    subject,
    htmlContent,
    textContent
  });
}

module.exports = {
  sendEmail,
  sendOTPEmail
};
