/**
 * Email Verification Page with OTP
 * Enhanced email verification using One-Time Password system
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import EmailOTPVerification from '../components/EmailOTPVerification';
import secureNotification from '../utils/secureNotification';
import emailOTPService from '../utils/emailOTPService';

const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, refreshUser } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Get email from location state or current user
  useEffect(() => {
    const initializeVerification = async () => {
      try {
        setLoading(true);
        
        let targetEmail = null;
        
        // Check location state first (from registration)
        if (location.state?.email) {
          targetEmail = location.state.email;
        } 
        // Check current user
        else if (currentUser?.email) {
          targetEmail = currentUser.email;
          
          // Check if already verified
          if (currentUser.emailVerified) {
            secureNotification.success('Your email is already verified!');
            navigate('/', { replace: true });
            return;
          }
        }
        
        if (!targetEmail) {
          setError('No email found for verification');
          return;
        }

        setEmail(targetEmail);
        
        // Check if there's an existing OTP
        const otpStatus = await emailOTPService.checkOTPStatus(targetEmail, 'verification');
        
        if (otpStatus.exists && !otpStatus.expired) {
          setShowOTP(true);
          setVerificationSent(true);
        } else {
          // Send new OTP
          await sendVerificationOTP(targetEmail);
        }
        
      } catch (error) {
        console.error('Verification initialization error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeVerification();
  }, [currentUser, location.state, navigate]);

  const sendVerificationOTP = async (targetEmail) => {
    try {
      setLoading(true);
      setError('');
      
      const result = await emailOTPService.sendOTP(
        targetEmail, 
        'verification',
        {
          subject: 'Verify Your Ojawa E-commerce Account',
          customMessage: 'Thank you for registering with Ojawa E-commerce!'
        }
      );
      
      if (result.success) {
        setShowOTP(true);
        setVerificationSent(true);
        secureNotification.success('Verification code sent to your email!');
      }
    } catch (error) {
      setError(error.message);
      secureNotification.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerified = async (result) => {
    try {
      setLoading(true);
      
      // Refresh user to get updated verification status
      await refreshUser();
      
      // Mark email as verified in Firestore
      if (currentUser) {
        await updateEmailVerificationStatus(currentUser.uid);
      }
      
      secureNotification.success('Email verified successfully!');
      
      // Redirect to intended destination or home
      const intendedDestination = location.state?.from || '/';
      navigate(intendedDestination, { replace: true });
      
    } catch (error) {
      console.error('Email verification completion error:', error);
      setError('Verification completed but failed to update status. Please try logging in.');
    } finally {
      setLoading(false);
    }
  };

  const updateEmailVerificationStatus = async (userId) => {
    try {
      // This would typically be handled by a Cloud Function
      // For now, we'll use the existing Firebase email verification
      const { updateDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');
      
      await updateDoc(doc(db, 'users', userId), {
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating email verification status:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    navigate('/login');
  };

  const handleResendEmail = async () => {
    if (!email) return;
    
    try {
      await sendVerificationOTP(email);
    } catch (error) {
      console.error('Resend error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up verification...</p>
        </div>
      </div>
    );
  }

  if (error && !showOTP) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verification Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
          <p className="text-gray-600">
            Complete your registration by verifying your email address
          </p>
        </div>

        {/* OTP Verification Component */}
        {showOTP && (
          <EmailOTPVerification
            email={email}
            purpose="verification"
            onVerified={handleOTPVerified}
            onCancel={handleCancel}
            showResend={true}
          />
        )}

        {/* Instructions */}
        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">📧 Check Your Inbox</h3>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>• Look for an email from "Ojawa E-commerce"</li>
              <li>• Check your spam folder if you don't see it</li>
              <li>• The verification code expires in 10 minutes</li>
              <li>• Enter the 6-digit code above</li>
            </ul>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Didn't receive the email?{' '}
            <button
              onClick={handleResendEmail}
              className="text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Resend Code
            </button>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Having trouble?{' '}
            <a href="/support" className="text-emerald-600 hover:text-emerald-700">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
