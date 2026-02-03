import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import InputValidator from '../utils/inputValidator';
import secureNotification from '../utils/secureNotification';

const Register = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    userType: 'buyer'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [createdUserEmail, setCreatedUserEmail] = useState('');
  const [submittedCredentials, setSubmittedCredentials] = useState(null);
  const [resendStatus, setResendStatus] = useState('idle');
  const [postVerificationDestination, setPostVerificationDestination] = useState('');

  const { signup, resendVerificationEmailWithPassword, lastVerificationEmailSentAt, logout } = useAuth();
  const { getIntendedDestination } = useCart();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';
  const preselectedUserType = location.state?.userType;

  // Set preselected user type from login page
  useEffect(() => {
    if (preselectedUserType) {
      setFormData(prev => ({ ...prev, userType: preselectedUserType }));
    }
  }, [preselectedUserType]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data using InputValidator
    const validationRules = {
      displayName: { type: 'name', fieldName: 'Display Name', required: true },
      email: { type: 'email', required: true },
      password: { type: 'text', fieldName: 'Password', required: true, minLength: 6 },
      confirmPassword: { type: 'text', fieldName: 'Confirm Password', required: true },
      phone: { type: 'phone', required: false },
      address: { type: 'address', fieldName: 'Address', required: false }
    };

    const validation = InputValidator.validateForm(formData, validationRules);
    
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setError(firstError);
      secureNotification.error(firstError);
      return;
    }

    // Additional password match validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      secureNotification.error('Passwords do not match');
      return;
    }

    const sanitizedData = validation.sanitizedData;

    try {
      setError('');
      setSuccessMessage('');
      setResendStatus('idle');
      setLoading(true);
      await signup(sanitizedData.email, sanitizedData.password, {
        displayName: sanitizedData.displayName,
        phone: sanitizedData.phone,
        address: sanitizedData.address,
        userType: formData.userType
      });

      const intendedDestination = getIntendedDestination();
      const fallbackDestination = intendedDestination?.path || from;
      setPostVerificationDestination(fallbackDestination);
      setSubmittedCredentials({
        email: sanitizedData.email,
        password: sanitizedData.password
      });
      setCreatedUserEmail(sanitizedData.email);
      setRegistrationComplete(true);
      setSuccessMessage('Almost there! We emailed a verification link to activate your account.');
      setResendStatus('idle');
      secureNotification.success('Registration successful! Please check your email for verification.');

      try {
        await logout();
      } catch (signOutError) {
        console.error('Error signing out after registration:', signOutError);
      }
    } catch (error) {
      const errorMessage = error.message?.includes('already in use') 
        ? 'Email address is already registered. Please use a different email or try logging in.'
        : 'Failed to create account. Please try again.';
      setError(errorMessage);
      secureNotification.error(errorMessage);
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const canResendVerification = () => {
    if (!lastVerificationEmailSentAt) return true;
    const lastSent = new Date(lastVerificationEmailSentAt).getTime();
    if (Number.isNaN(lastSent)) return true;
    return Date.now() - lastSent > 60000;
  };

  const handleResendVerification = async () => {
    if (!registrationComplete || resendStatus === 'sending') return;
    if (!canResendVerification()) {
      setResendStatus('cooldown');
      return;
    }

    const credentials = submittedCredentials || {
      email: formData.email,
      password: formData.password
    };

    if (!credentials.email || !credentials.password) {
      setResendStatus('error');
      setError('Please re-enter your email and password, then click "Create Account" before resending.');
      return;
    }

    try {
      setResendStatus('sending');
      const result = await resendVerificationEmailWithPassword(credentials.email, credentials.password);
      if (result?.alreadyVerified) {
        setResendStatus('verified');
        setSuccessMessage('Great news! Your email is already verified. Please sign in.');
        return;
      }
      setResendStatus('sent');
    } catch (err) {
      console.error('Failed to resend verification email:', err);
      setResendStatus('error');
      setError(err.message || 'Failed to resend verification email. Please try again.');
    }
  };

  const resendButtonLabel = (() => {
    if (resendStatus === 'sent') return 'Verification email re-sent!';
    if (resendStatus === 'sending') return 'Sending...';
    if (resendStatus === 'cooldown') return 'Please wait a minute before resending';
    if (resendStatus === 'verified') return 'Email already verified! Sign in now.';
    if (resendStatus === 'error') return 'Try resending email';
    return 'Resend verification email';
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {preselectedUserType && (
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-900/40 border border-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">
                  {preselectedUserType === 'buyer' ? '🛒' : preselectedUserType === 'vendor' ? '🏪' : '🚚'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 bg-emerald-900/20 border border-emerald-800/60 px-3 py-1 rounded-full text-sm text-emerald-300 mb-4">
                <span>Creating {preselectedUserType === 'buyer' ? 'Buyer' : preselectedUserType === 'vendor' ? 'Vendor' : 'Logistics'} Account</span>
              </div>
            </div>
          )}
          
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            {preselectedUserType === 'buyer' ? 'Start Shopping Safely' : 
             preselectedUserType === 'vendor' ? 'Start Selling Today' :
             preselectedUserType === 'logistics' ? 'Join Our Delivery Network' :
             'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-teal-200">
            {preselectedUserType === 'buyer' ? 'Join thousands of buyers shopping with wallet protection' :
             preselectedUserType === 'vendor' ? 'Reach customers across Africa with guaranteed payments' :
             preselectedUserType === 'logistics' ? 'Provide delivery services and earn competitive rates' :
             'Join the Ojawa marketplace'}
          </p>
          <p className="mt-2 text-center text-sm text-teal-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-emerald-400 hover:text-emerald-300"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📬</span>
              <div>
                <h3 className="font-semibold text-sm">Verify your email to continue</h3>
                <p className="text-xs text-emerald-800">
                  {successMessage}
                  {createdUserEmail && (
                    <>
                      {' '}We sent it to <strong>{createdUserEmail}</strong>.
                    </>
                  )}
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  Open the email, click the verification button, then sign in to finish onboarding.
                  {postVerificationDestination && (
                    <>
                      {' '}We’ll send you to <strong>{postVerificationDestination}</strong> once you log back in.
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={
                  resendStatus === 'sending' ||
                  resendStatus === 'cooldown' ||
                  resendStatus === 'verified' ||
                  !canResendVerification()
                }
                className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg border border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {resendButtonLabel}
              </button>
              <Link
                to="/login"
                state={{ verificationEmail: createdUserEmail, from: { pathname: postVerificationDestination || '/dashboard' } }}
                className="w-full inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-lg border border-transparent text-white bg-emerald-600 hover:bg-emerald-700"
              >
                I’ve verified my email — take me to login
              </Link>
            </div>
          </div>
        )}
        
        {preselectedUserType === 'buyer' && (
          <div className="bg-slate-900 rounded-lg border border-emerald-900/60 p-4 mb-6">
            <h3 className="font-semibold text-white mb-3">Why buyers love Ojawa:</h3>
            <div className="space-y-2 text-sm text-teal-200">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Your money is protected until you confirm delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Shop from verified vendors across Africa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Free dispute resolution if something goes wrong</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Multiple delivery options with real-time tracking</span>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {!preselectedUserType && (
              <div>
                <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
                  I want to join as *
                </label>
                <select
                  id="userType"
                  name="userType"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  value={formData.userType}
                  onChange={handleChange}
                >
                  <option value="buyer">🛒 Buyer - I want to shop safely</option>
                  <option value="vendor">🏪 Vendor - I want to sell products</option>
                  <option value="logistics">🚚 Logistics Partner - I provide delivery services</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Enter your full name"
                value={formData.displayName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address {preselectedUserType === 'buyer' ? '(for deliveries)' : ''}
              </label>
              <textarea
                id="address"
                name="address"
                rows={3}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder={preselectedUserType === 'buyer' ? 'Enter your delivery address (can be updated later)' : 'Enter your address'}
                value={formData.address}
                onChange={handleChange}
              />
              {preselectedUserType === 'buyer' && (
                <p className="text-xs text-gray-500 mt-1">
                  This helps us show you accurate delivery options and pricing
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 top-1 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 top-1 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {preselectedUserType === 'buyer' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-600">🛡️</span>
                <span className="font-medium text-emerald-800">Wallet Protection Included</span>
              </div>
              <p className="text-sm text-emerald-700">
                Your payments will be held securely until you confirm delivery. Shop with confidence!
              </p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 
               preselectedUserType === 'buyer' ? 'Start Shopping Safely' :
               preselectedUserType === 'vendor' ? 'Start Selling Today' :
               preselectedUserType === 'logistics' ? 'Join Delivery Network' :
               'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
