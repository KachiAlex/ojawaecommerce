import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const AdminSetup = () => {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const makeCurrentUserAdmin = async () => {
    if (!currentUser) {
      setMessage('Please login first');
      return;
    }
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        role: 'admin',
        isAdmin: true
      });
      setMessage('✅ You are now an admin! Please refresh the page.');
    } catch (error) {
      console.error('Error making user admin:', error);
      setMessage('❌ Failed to make user admin: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Setup</h1>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Current User:</p>
            <p className="font-medium">{currentUser?.email || 'Not logged in'}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">Current Role:</p>
            <p className="font-medium">{userProfile?.role || 'No role'}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600">User ID:</p>
            <p className="font-mono text-xs text-gray-500">{currentUser?.uid || 'N/A'}</p>
          </div>
          
          {message && (
            <div className={`p-3 rounded-md ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}
          
          <button
            onClick={makeCurrentUserAdmin}
            disabled={loading || userProfile?.role === 'admin'}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : userProfile?.role === 'admin' ? 'Already Admin' : 'Make Me Admin'}
          </button>
          
          {userProfile?.role === 'admin' && (
            <a
              href="/admin"
              className="block w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-center"
            >
              Go to Admin Dashboard
            </a>
          )}
          
          <a
            href="/"
            className="block w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 text-center"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
