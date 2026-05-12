import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';
import MobileBottomSheet from './MobileBottomSheet';

const TwoFactorAuth = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState('setup'); // 'setup', 'verify', 'complete'
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && step === 'setup') {
      generateSecret();
    }
  }, [isOpen, step]);

  const generateSecret = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.auth.generate2FASecret(currentUser.uid);
      setQrCode(result.qrCode);
      setSecret(result.secret);
    } catch (error) {
      setError('Failed to generate 2FA secret');
      console.error('2FA setup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    try {
      setLoading(true);
      const result = await firebaseService.auth.verify2FACode(
        currentUser.uid,
        verificationCode,
        secret
      );
      
      if (result.valid) {
        setBackupCodes(result.backupCodes);
        setStep('complete');
      } else {
        setError('Invalid verification code');
      }
    } catch (error) {
      setError('Verification failed');
      console.error('2FA verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = () => {
    onSuccess();
    onClose();
  };

  const renderSetupStep = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Enable Two-Factor Authentication</h3>
      <p className="text-gray-600 mb-4">
        Scan the QR code with your authenticator app to set up 2FA.
      </p>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="text-center">
          <div className="bg-white p-4 rounded-lg inline-block mb-4">
            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Can't scan? Use this code: <code className="bg-gray-100 px-2 py-1 rounded">{secret}</code>
          </p>
          <button
            onClick={() => setStep('verify')}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700"
          >
            I've scanned the code
          </button>
        </div>
      )}
    </div>
  );

  const renderVerifyStep = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Verify Setup</h3>
      <p className="text-gray-600 mb-4">
        Enter the 6-digit code from your authenticator app.
      </p>
      
      <div className="mb-4">
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          placeholder="000000"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-2xl tracking-widest"
          maxLength={6}
        />
      </div>
      
      {error && (
        <div className="text-red-600 text-sm mb-4">{error}</div>
      )}
      
      <div className="flex space-x-3">
        <button
          onClick={() => setStep('setup')}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={verifyCode}
          disabled={verificationCode.length !== 6 || loading}
          className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">2FA Enabled Successfully!</h3>
        <p className="text-gray-600">
          Your account is now protected with two-factor authentication.
        </p>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h4 className="font-medium text-yellow-800 mb-2">Backup Codes</h4>
        <p className="text-sm text-yellow-700 mb-3">
          Save these codes in a safe place. You can use them to access your account if you lose your phone.
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm font-mono">
          {backupCodes.map((code, index) => (
            <div key={index} className="bg-white p-2 rounded border">
              {code}
            </div>
          ))}
        </div>
      </div>
      
      <button
        onClick={completeSetup}
        className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
      >
        Complete Setup
      </button>
    </div>
  );

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    return (
      <MobileBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Two-Factor Authentication"
        snapPoints={[0.8, 0.95]}
      >
        {step === 'setup' && renderSetupStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'complete' && renderCompleteStep()}
      </MobileBottomSheet>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative ml-auto mr-auto mt-20 max-w-md bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {step === 'setup' && renderSetupStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
};

export default TwoFactorAuth;
