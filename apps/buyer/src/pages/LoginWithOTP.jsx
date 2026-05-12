/**
 * Login with OTP Page
 * Enhanced login using One-Time Password instead of password
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import EmailOTPVerification from '../components/EmailOTPVerification';
import secureNotification from '../utils/secureNotification';
import emailOTPService from '../utils/emailOTPService';
import InputValidator from '../utils/inputValidator';

const LoginWithOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithOTP } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    const emailValidation = InputValidator.validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.message);
      secureNotification.error(emailValidation.message);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Send OTP for login
      const result = await emailOTPService.sendOTP(
        emailValidation.sanitized,
        'login',
        {
          subject: 'Login Code for Ojawa E-commerce',
          customMessage: 'Use this code to securely log into your account.'
        }
      );
      
      if (result.success) {
        setShowOTP(true);
        setOtpSent(true);
        secureNotification.success('Login code sent to your email!');
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
      
      // Complete login with OTP verification
      const loginResult = await signInWithOTP(email, result.verifiedAt);
      
      if (loginResult.success) {
        secureNotification.success('Login successful!');
        
        // Redirect to intended destination
        const intendedDestination = location.state?.from || '/';
        navigate(intendedDestination, { replace: true });
      }
    } catch (error) {
      console.error('OTP login completion error:', error);
      setError('Login failed. Please try again.');
      secureNotification.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowOTP(false);
    setOtpSent(false);
  };

  const handleBackToPassword = () => {
    navigate('/login');
  };

  if (showOTP) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Login with Code</h1>
            <p className="text-gray-600">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <EmailOTPVerification
            email={email}
            purpose="login"
            onVerified={handleOTPVerified}
            onCancel={handleCancel}
            customMessage="Enter the code to securely log into your account"
            showResend={true}
          />

          <div className="mt-6 text-center">
            <button
              onClick={handleBackToPassword}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back to password login
            </button>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Login with OTP</h1>
          <p className="text-gray-600">
            Enter your email to receive a secure login code
          </p>
        </div>

        {/* Email Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-emerald-600 text-white px-4 py-3 rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending Code...' : 'Send Login Code'}
            </button>
          </form>

          {/* Alternative Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <button
                onClick={handleBackToPassword}
                className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
              >
                Login with Password
              </button>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-8">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h3 className="font-medium text-emerald-900 mb-2">🔐 Why Login with OTP?</h3>
            <ul className="text-sm text-emerald-800 space-y-1">
              <li>• More secure than traditional passwords</li>
              <li>• No need to remember complex passwords</li>
              <li>• Code expires automatically for security</li>
              <li>• Works with any email address</li>
            </ul>
          </div>
        </div>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginWithOTP;
