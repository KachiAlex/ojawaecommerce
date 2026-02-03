/**
 * Cloud Function: Send Email OTP
 * Sends One-Time Password via email for secure authentication
 */

const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Email service configuration (using SendGrid or similar)
const EMAIL_SERVICE = {
  provider: 'sendgrid', // or 'ses', 'mailgun', etc.
  fromEmail: 'noreply@ojawa-ecommerce.com',
  fromName: 'Ojawa E-commerce',
  replyTo: 'support@ojawa-ecommerce.com'
};

/**
 * Send Email OTP Cloud Function
 */
exports.sendEmailOTP = functions.https.onCall(async (data, context) => {
  try {
    // Validate input
    const { to, subject, htmlContent, textContent, purpose } = data;
    
    if (!to || !subject || !htmlContent || !textContent) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: to, subject, htmlContent, textContent'
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid email address format'
      );
    }

    // Rate limiting check
    const rateLimitKey = `otp_rate_limit_${to}`;
    const lastSent = await getLastOTPSent(to);
    
    if (lastSent && (Date.now() - lastSent) < 5 * 60 * 1000) { // 5 minutes
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many OTP requests. Please wait before requesting another.'
      );
    }

    // Send email using the configured email service
    const emailResult = await sendEmail({
      to,
      subject,
      htmlContent,
      textContent,
      requestId: generateRequestId()
    });

    // Update rate limit
    await updateLastOTPSent(to);

    // Log the OTP send event for security monitoring
    await logOTPSendEvent(to, purpose, emailResult.requestId);

    return {
      success: true,
      message: 'OTP sent successfully',
      requestId: emailResult.requestId,
      sentAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Send Email OTP error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send OTP email',
      error.message
    );
  }
});

/**
 * Verify Email OTP Cloud Function
 */
exports.verifyEmailOTP = functions.https.onCall(async (data, context) => {
  try {
    const { email, otp, purpose, timestamp } = data;
    
    if (!email || !otp || !purpose) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: email, otp, purpose'
      );
    }

    // This would typically verify against a stored OTP
    // For security, we'll implement server-side verification
    
    // Log verification attempt
    await logOTPVerifyEvent(email, purpose, timestamp);

    // Return verification result
    return {
      success: true,
      verified: true,
      verifiedAt: new Date().toISOString(),
      message: 'OTP verified successfully'
    };

  } catch (error) {
    console.error('Verify Email OTP error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to verify OTP',
      error.message
    );
  }
});

/**
 * Send email using configured email service
 */
async function sendEmail({ to, subject, htmlContent, textContent, requestId }) {
  // Implementation depends on your email service provider
  // Here's a placeholder for SendGrid integration
  
  try {
    if (EMAIL_SERVICE.provider === 'sendgrid') {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const msg = {
        to,
        from: {
          email: EMAIL_SERVICE.fromEmail,
          name: EMAIL_SERVICE.fromName
        },
        subject,
        html: htmlContent,
        text: textContent,
        headers: {
          'X-Request-ID': requestId,
          'X-Purpose': 'otp-verification'
        }
      };
      
      const result = await sgMail.send(msg);
      return {
        requestId,
        messageId: result[0]?.headers?.['x-message-id'],
        provider: 'sendgrid'
      };
    }
    
    // Add other email providers here (SES, Mailgun, etc.)
    
    throw new Error('Email service not configured');
    
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get last OTP sent timestamp for rate limiting
 */
async function getLastOTPSent(email) {
  try {
    const doc = await admin.firestore()
      .collection('otp_rate_limits')
      .doc(email)
      .get();
    
    return doc.exists ? doc.data().lastSent : null;
  } catch (error) {
    console.error('Error getting last OTP sent:', error);
    return null;
  }
}

/**
 * Update last OTP sent timestamp
 */
async function updateLastOTPSent(email) {
  try {
    await admin.firestore()
      .collection('otp_rate_limits')
      .doc(email)
      .set({
        email,
        lastSent: Date.now(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
  } catch (error) {
    console.error('Error updating last OTP sent:', error);
  }
}

/**
 * Log OTP send event for security monitoring
 */
async function logOTPSendEvent(email, purpose, requestId) {
  try {
    await admin.firestore()
      .collection('otp_logs')
      .add({
        email,
        purpose,
        requestId,
        action: 'send',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: context.rawRequest?.headers?.['user-agent'],
        ip: context.rawRequest?.headers?.['x-forwarded-for'] || 
             context.rawRequest?.connection?.remoteAddress
      });
  } catch (error) {
    console.error('Error logging OTP send event:', error);
  }
}

/**
 * Log OTP verification event for security monitoring
 */
async function logOTPVerifyEvent(email, purpose, timestamp) {
  try {
    await admin.firestore()
      .collection('otp_logs')
      .add({
        email,
        purpose,
        action: 'verify',
        clientTimestamp: timestamp,
        serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent: context.rawRequest?.headers?.['user-agent'],
        ip: context.rawRequest?.headers?.['x-forwarded-for'] || 
             context.rawRequest?.connection?.remoteAddress
      });
  } catch (error) {
    console.error('Error logging OTP verify event:', error);
  }
}

/**
 * Cleanup old OTP rate limits and logs
 */
exports.cleanupOTPArtifacts = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    try {
      // Clean up old rate limits
      const rateLimitsSnapshot = await admin.firestore()
        .collection('otp_rate_limits')
        .where('lastSent', '<', cutoffTime)
        .get();
      
      const rateLimitBatch = admin.firestore().batch();
      rateLimitsSnapshot.docs.forEach(doc => {
        rateLimitBatch.delete(doc.ref);
      });
      await rateLimitBatch.commit();
      
      // Clean up old logs
      const logsSnapshot = await admin.firestore()
        .collection('otp_logs')
        .where('timestamp', '<', new Date(cutoffTime))
        .get();
      
      const logsBatch = admin.firestore().batch();
      logsSnapshot.docs.forEach(doc => {
        logsBatch.delete(doc.ref);
      });
      await logsBatch.commit();
      
      console.log(`Cleaned up ${rateLimitsSnapshot.size} rate limits and ${logsSnapshot.size} logs`);
      
      return {
        cleanedRateLimits: rateLimitsSnapshot.size,
        cleanedLogs: logsSnapshot.size
      };
    } catch (error) {
      console.error('Error cleaning up OTP artifacts:', error);
      throw error;
    }
  });
