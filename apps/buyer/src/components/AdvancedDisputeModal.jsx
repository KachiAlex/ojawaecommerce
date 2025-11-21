import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const AdvancedDisputeModal = ({ order, isOpen, onClose, onDisputeCreated }) => {
  const { currentUser } = useAuth();
  const [disputeData, setDisputeData] = useState({
    reason: '',
    description: '',
    evidence: [],
    requestedResolution: '',
    urgency: 'medium'
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const disputeReasons = [
    { value: 'item_not_received', label: 'Item not received', description: 'Order was not delivered' },
    { value: 'item_damaged', label: 'Item damaged', description: 'Product arrived in poor condition' },
    { value: 'wrong_item', label: 'Wrong item', description: 'Received different product than ordered' },
    { value: 'quality_issue', label: 'Quality issue', description: 'Product quality does not match description' },
    { value: 'seller_unresponsive', label: 'Seller unresponsive', description: 'Vendor not responding to messages' },
    { value: 'delivery_delay', label: 'Delivery delay', description: 'Significant delay in delivery' },
    { value: 'refund_not_processed', label: 'Refund not processed', description: 'Refund request not handled' },
    { value: 'other', label: 'Other', description: 'Other issue not listed above' }
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low', description: 'Can wait 3-5 business days', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', description: 'Needs attention within 1-2 days', color: 'text-yellow-600' },
    { value: 'high', label: 'High', description: 'Urgent - needs immediate attention', color: 'text-red-600' }
  ];

  const handleInputChange = (field, value) => {
    setDisputeData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const uploadPromises = files.map(async (file) => {
        // Validate file type and size
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && file.type !== 'application/pdf') {
          throw new Error(`File type ${file.type} is not supported`);
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          throw new Error('File size must be less than 10MB');
        }

        // Upload to Firebase Storage
        const fileName = `dispute-evidence/${order.id}/${Date.now()}-${file.name}`;
        const downloadURL = await firebaseService.storage.uploadFile(file, fileName);

        return {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: downloadURL,
          uploadedAt: new Date()
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      
      setDisputeData(prev => ({
        ...prev,
        evidence: [...prev.evidence, ...uploadedFiles]
      }));

    } catch (error) {
      setError(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const removeEvidence = (evidenceId) => {
    setDisputeData(prev => ({
      ...prev,
      evidence: prev.evidence.filter(e => e.id !== evidenceId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!disputeData.reason || !disputeData.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const disputePayload = {
        orderId: order.id,
        buyerId: currentUser.uid,
        vendorId: order.vendorId,
        reason: disputeData.reason,
        description: disputeData.description.trim(),
        evidence: disputeData.evidence,
        requestedResolution: disputeData.requestedResolution,
        urgency: disputeData.urgency,
        status: 'open',
        createdAt: new Date(),
        totalAmount: order.totalAmount
      };

      // Create dispute with wallet hold
      await firebaseService.disputes.createWithWalletHold(
        disputePayload,
        order.id,
        order.totalAmount
      );

      // Create notification for vendor
      await firebaseService.notifications.createVendorNotification(
        order.vendorId,
        'dispute_created',
        order
      );

      // Create notification for buyer
      await firebaseService.notifications.createOrderNotification(
        { id: order.id, buyerId: currentUser.uid, status: 'disputed' },
        'dispute_created'
      );

      onDisputeCreated();
      onClose();

    } catch (error) {
      console.error('Error creating dispute:', error);
      setError(`Failed to create dispute: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create Dispute</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Order Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Order Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Order ID:</span>
                  <span className="ml-2 font-medium">#{order.id}</span>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <span className="ml-2 font-medium">₦{order.totalAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span className="ml-2 font-medium capitalize">{order.status.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dispute Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Dispute *
                </label>
                <select
                  value={disputeData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select a reason</option>
                  {disputeReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label} - {reason.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Description *
                </label>
                <textarea
                  value={disputeData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Please provide a detailed description of the issue..."
                  required
                />
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Evidence (Photos, Videos, Documents)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Evidence'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Supported: Images, Videos, PDFs (Max 10MB each)
                  </p>
                </div>

                {/* Uploaded Evidence */}
                {disputeData.evidence.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Evidence:</h4>
                    <div className="space-y-2">
                      {disputeData.evidence.map((evidence) => (
                        <div key={evidence.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">
                              {evidence.type.startsWith('image/') ? '🖼️' : 
                               evidence.type.startsWith('video/') ? '🎥' : '📄'}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{evidence.name}</p>
                              <p className="text-xs text-gray-500">
                                {(evidence.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEvidence(evidence.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Requested Resolution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What resolution would you like?
                </label>
                <select
                  value={disputeData.requestedResolution}
                  onChange={(e) => handleInputChange('requestedResolution', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select preferred resolution</option>
                  <option value="refund">Full refund</option>
                  <option value="partial_refund">Partial refund</option>
                  <option value="replacement">Item replacement</option>
                  <option value="reshipment">Reshipment</option>
                  <option value="other">Other (specify in description)</option>
                </select>
              </div>

              {/* Urgency Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level
                </label>
                <div className="space-y-2">
                  {urgencyLevels.map((level) => (
                    <label key={level.value} className="flex items-center">
                      <input
                        type="radio"
                        name="urgency"
                        value={level.value}
                        checked={disputeData.urgency === level.value}
                        onChange={(e) => handleInputChange('urgency', e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <span className={`font-medium ${level.color}`}>{level.label}</span>
                        <p className="text-sm text-gray-500">{level.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Important Notice
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Funds for this order will be held until the dispute is resolved</li>
                        <li>Our team will review your dispute within 24-48 hours</li>
                        <li>Both parties will be contacted for additional information if needed</li>
                        <li>False disputes may result in account restrictions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Creating Dispute...' : 'Create Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedDisputeModal;
