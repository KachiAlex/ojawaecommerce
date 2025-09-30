import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const VendorProfileModal = ({ isOpen, onClose, onUpdate }) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    storeName: '',
    profilePicture: null,
    website: '',
    businessAddress: '',
    businessPhone: '',
    utilityBill: null
  });

  useEffect(() => {
    if (isOpen && userProfile?.vendorProfile) {
      setFormData({
        storeName: userProfile.vendorProfile.storeName || '',
        profilePicture: null,
        website: userProfile.vendorProfile.website || '',
        businessAddress: userProfile.vendorProfile.businessAddress || '',
        businessPhone: userProfile.vendorProfile.businessPhone || '',
        utilityBill: null
      });
    }
  }, [isOpen, userProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files[0] || null
    }));
  };

  const uploadFile = async (file, path) => {
    if (!file) return null;
    
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('../firebase/config');
      
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updates = {
        vendorProfile: {
          ...userProfile.vendorProfile,
          storeName: formData.storeName,
          website: formData.website || null,
          businessAddress: formData.businessAddress,
          businessPhone: formData.businessPhone,
          updatedAt: new Date()
        }
      };

      // Upload profile picture if provided
      if (formData.profilePicture) {
        const profilePicUrl = await uploadFile(
          formData.profilePicture, 
          `vendor-profiles/${currentUser.uid}/profile-picture.jpg`
        );
        updates.vendorProfile.profilePicture = profilePicUrl;
      }

      // Upload utility bill if provided
      if (formData.utilityBill) {
        const utilityBillUrl = await uploadFile(
          formData.utilityBill, 
          `vendor-verification/${currentUser.uid}/utility-bill.pdf`
        );
        updates.vendorProfile.utilityBillUrl = utilityBillUrl;
        updates.vendorProfile.addressVerificationStatus = 'pending';
      }

      await updateUserProfile(updates);
      setSuccess('Profile updated successfully!');
      
      if (onUpdate) {
        onUpdate(updates.vendorProfile);
      }
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Update Vendor Profile</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Name *
            </label>
            <input
              type="text"
              name="storeName"
              value={formData.storeName}
              onChange={handleInputChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter your store name"
            />
          </div>

          {/* Profile Picture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Picture
            </label>
            <input
              type="file"
              name="profilePicture"
              onChange={handleFileChange}
              accept="image/*"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">Upload a clear profile picture for your store</p>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website (Optional)
            </label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="https://your-website.com"
            />
          </div>

          {/* Business Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Address *
            </label>
            <textarea
              name="businessAddress"
              value={formData.businessAddress}
              onChange={handleInputChange}
              required
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter your complete business address"
            />
          </div>

          {/* Business Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Phone *
            </label>
            <input
              type="tel"
              name="businessPhone"
              value={formData.businessPhone}
              onChange={handleInputChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Enter your business phone number"
            />
          </div>

          {/* Utility Bill for Address Verification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Utility Bill for Address Verification
            </label>
            <input
              type="file"
              name="utilityBill"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload a utility bill (electricity, water, etc.) to verify your business address
            </p>
          </div>

          {/* Store Link Preview */}
          {formData.storeName && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Store Link Preview</h4>
              <p className="text-sm text-gray-600">
                Your store will be accessible at: 
                <span className="font-mono text-emerald-600">
                  /store/{formData.storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}
                </span>
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorProfileModal;
