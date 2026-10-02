/**
 * Email OTP Verification Component
 * Provides UI for OTP input, validation, and resend functionality
 */

import { useState, useEffect } from 'react';
import emailOTPService from '../utils/emailOTPService';
import secureNotification from '../utils/secureNotification';
import InputValidator from '../utils/inputValidator';

const EmailOTPVerification = ({ 
  email, 
  purpose = 'verification', 
  onVerified, 
  onCancel, 
  customMessage = null,
  showResend = true 
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [otpStatus, setOtpStatus] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Check OTP status on mount
  useEffect(() => {
    checkOTPStatus();
  }, [email, purpose]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1000), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && otpStatus?.exists) {
      setCanResend(true);
    }
  }, [timeLeft, otpStatus]);

  const checkOTPStatus = async () => {
    try {
      const status = await emailOTPService.checkOTPStatus(email, purpose);
      setOtpStatus(status);
      
      if (status.exists && !status.expired) {
        setTimeLeft(status.remainingTime);
        setCanResend(false);
      } else {
        setCanResend(true);
      }
    } catch (error) {
      console.error('Error checking OTP status:', error);
    }
  };

  const handleOTPChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }

    // Auto-verify when all digits are entered
    if (newOtp.every(digit => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }

    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePaste();
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, '').slice(0, 6);
      
      if (digits.length === 6) {
        const newOtp = digits.split('');
        setOtp(newOtp);
        
        // Auto-verify
        setTimeout(() => handleVerify(digits), 100);
      }
    } catch (error) {
      console.error('Paste error:', error);
    }
  };

  const handleVerify = async (otpValue = null) => {
    const otpToVerify = otpValue || otp.join('');
    
    if (otpToVerify.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    try {
      setVerifying(true);
      setError('');
      
      const result = await emailOTPService.verifyOTP(email, otpToVerify, purpose);
      
      if (result.success) {
        secureNotification.success('Email verified successfully!');
        onVerified && onVerified(result);
      }
    } catch (error) {
      setError(error.message);
      secureNotification.error(error.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setResendLoading(true);
      setError('');
      
      const result = await emailOTPService.resendOTP(email, purpose);
      
      if (result.success) {
        secureNotification.success('New OTP sent to your email!');
        setOtp(['', '', '', '', '', '']);
        setTimeLeft(result.expiresAt - Date.now());
        setCanResend(false);
        await checkOTPStatus();
      }
    } catch (error) {
      setError(error.message);
      secureNotification.error(error.message);
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getInputStyle = (index) => {
    const baseStyle = "w-12 h-12 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 transition-all";
    
    if (error) {
      return `${baseStyle} border-red-300 focus:border-red-500 focus:ring-red-200`;
    }
    
    if (otp[index]) {
      return `${baseStyle} border-emerald-500 bg-emerald-50`;
    }
    
    return `${baseStyle} border-gray-300 focus:border-emerald-500 focus:ring-emerald-200`;
  };

  const getPurposeMessage = () => {
    const messages = {
      verification: 'Please verify your email address to continue',
      login: 'Enter the code sent to your email to complete login',
      password_reset: 'Enter the code to reset your password',
      transaction: 'Enter the code to authorize this transaction'
    };
    
    return customMessage || messages[purpose] || messages.verification;
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
        <p className="text-gray-600 mb-4">{getPurposeMessage()}</p>
        <p className="text-sm text-gray-500">
          We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="mb-6">
        <div className="flex justify-center gap-2 mb-4">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              value={digit}
              onChange={(e) => handleOTPChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={getInputStyle(index)}
              maxLength={1}
              disabled={verifying}
              autoComplete="off"
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Timer and Resend */}
      <div className="text-center mb-6">
        {timeLeft > 0 ? (
          <p className="text-sm text-gray-600">
            Code expires in <span className="font-medium text-emerald-600">{formatTime(timeLeft)}</span>
          </p>
        ) : canResend && showResend ? (
          <div>
            <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        ) : null}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={verifying}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        
        <button
          onClick={() => handleVerify()}
          disabled={otp.join('').length !== 6 || verifying}
          className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verifying ? 'Verifying...' : 'Verify'}
        </button>
      </div>

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Security Notice:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Never share this code with anyone</li>
              <li>We'll never ask for your password via email</li>
              <li>This code expires in 10 minutes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailOTPVerification;
