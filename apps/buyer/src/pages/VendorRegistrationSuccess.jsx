import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const VendorRegistrationSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, sendVerificationEmail } = useAuth();
  const [verificationSent, setVerificationSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const state = location.state || {};
  const userEmail = state.userEmail || currentUser?.email;
  const requiresEmailVerification = state.requiresEmailVerification;

  useEffect(() => {
    // Auto-send verification email if needed
    if (requiresEmailVerification && !verificationSent && sendVerificationEmail) {
      setVerificationSent(true);
    }
  }, [requiresEmailVerification, verificationSent, sendVerificationEmail]);

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      setError('');
      await sendVerificationEmail();
      alert('Verification email sent! Check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send verification email');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerification = () => {
    // Refresh and check if email is verified, then navigate
    window.location.reload();
  };

  if (!requiresEmailVerification && currentUser?.emailVerified) {
    // Email is verified, navigate to vendor dashboard
    navigate('/vendor', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-4">
              <span className="text-4xl">🎉</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Successful!</h1>
            <p className="text-gray-600">Your vendor account has been created</p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {requiresEmailVerification ? (
              <>
                {/* Email Verification Required */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">📧</span>
                    <div>
                      <h2 className="font-semibold text-gray-900 mb-2">Verify Your Email</h2>
                      <p className="text-gray-600 mb-2">
                        We've sent a verification link to <strong>{userEmail}</strong>
                      </p>
                      <p className="text-gray-600 text-sm">
                        Please check your inbox (and spam folder) and click the link to verify your email address. This helps us keep your vendor account secure.
                      </p>
                    </div>
                  </div>
                </div>

                {/* What Happens Next */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">1</span>
                      <span>Check your email and click the verification link</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">2</span>
                      <span>Return here and refresh to access your vendor dashboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">3</span>
                      <span>Add your first products and start selling!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">4</span>
                      <span>Your account will be reviewed (usually within 24-48 hours)</span>
                    </li>
                  </ul>
                </div>

                {/* Verification Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-4">Your vendor profile has been saved:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium text-amber-600">⏳ Awaiting Email Verification</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Application Status:</span>
                      <span className="font-medium text-blue-600">🔍 Under Review</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Status:</span>
                      <span className="font-medium text-green-600">✅ Active</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCheckVerification}
                    className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-medium transition"
                  >
                    ✓ I've Verified My Email
                  </button>
                  <button
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="flex-1 border border-blue-600 text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 font-medium transition disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Resend Email'}
                  </button>
                </div>

                <p className="text-xs text-center text-gray-500">
                  Didn't receive the email? Check your spam folder or wait a few minutes
                </p>
              </>
            ) : (
              <>
                {/* Email Already Verified */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">✅</span>
                    <div>
                      <h2 className="font-semibold text-gray-900 mb-2">Email Verified!</h2>
                      <p className="text-gray-600">
                        Your email is verified. You're ready to access your vendor dashboard.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ready to Go */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">You're all set!</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>✓ Account created</li>
                    <li>✓ Email verified</li>
                    <li>✓ Vendor profile submitted</li>
                    <li>✓ Wallet created</li>
                  </ul>
                </div>

                <button
                  onClick={() => navigate('/vendor')}
                  className="w-full bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 font-medium transition"
                >
                  Go to Vendor Dashboard →
                </button>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-gray-600 mb-4">
              Need help? Check our <a href="/help" className="text-blue-600 hover:underline">Help Center</a>
            </p>
            <button
              onClick={() => navigate('/buyer')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Continue as Buyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorRegistrationSuccess;
