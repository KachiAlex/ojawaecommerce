import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { storeService } from '../services/trackingService';

const CreateStoreForExistingVendor = () => {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleCreateStore = async () => {
    if (!userProfile?.vendorProfile) {
      setError('You need to be a vendor first. Complete vendor onboarding.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const vendorProfile = userProfile.vendorProfile;
      
      const storeData = {
        name: vendorProfile.storeName,
        description: vendorProfile.storeDescription,
        category: vendorProfile.businessType || 'general',
        contactInfo: {
          email: currentUser.email,
          phone: vendorProfile.businessPhone,
          address: vendorProfile.businessAddress
        },
        settings: {
          isPublic: true,
          allowReviews: true,
          showContactInfo: true
        }
      };
      
      const createdStore = await storeService.createStore(currentUser.uid, storeData);
      console.log('Store created:', createdStore);
      
      setSuccess(true);
    } catch (error) {
      console.error('Error creating store:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-green-400 text-2xl mr-3">✅</div>
          <div>
            <h3 className="text-lg font-semibold text-green-800">Store Created Successfully!</h3>
            <p className="text-green-600">
              Your store has been created and is now accessible. You can now preview your store.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile?.vendorProfile) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-yellow-400 text-2xl mr-3">⚠️</div>
          <div>
            <h3 className="text-lg font-semibold text-yellow-800">Vendor Profile Required</h3>
            <p className="text-yellow-600">
              You need to complete vendor onboarding first to create a store.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-blue-400 text-2xl mr-3">🏪</div>
          <div>
            <h3 className="text-lg font-semibold text-blue-800">Create Your Store</h3>
            <p className="text-blue-600">
              Create a store to enable store preview and public store links.
            </p>
          </div>
        </div>
        <button
          onClick={handleCreateStore}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Store'}
        </button>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default CreateStoreForExistingVendor;
