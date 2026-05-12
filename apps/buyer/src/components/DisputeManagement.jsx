import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/firebaseService';

const DisputeManagement = ({ userType = 'buyer' }) => {
  const { currentUser } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [orders, setOrders] = useState([]);
  
  // Create form state
  const [disputeForm, setDisputeForm] = useState({
    orderId: '',
    type: 'product_issue',
    subject: '',
    description: '',
    evidence: []
  });

  // Response form state
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser, userType]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load disputes based on user type
      let disputesData = [];
      if (userType === 'buyer') {
        disputesData = await firebaseService.disputes?.getByBuyer(currentUser.uid) || [];
      } else if (userType === 'vendor') {
        disputesData = await firebaseService.disputes?.getByVendor(currentUser.uid) || [];
      } else if (userType === 'logistics') {
        disputesData = await firebaseService.disputes?.getByLogistics(currentUser.uid) || [];
      }
      
      setDisputes(disputesData);

      // Load user's orders if buyer
      if (userType === 'buyer') {
        const ordersData = await firebaseService.orders.getByUser(currentUser.uid, 'buyer');
        // Filter to only completed/delivered orders
        const eligibleOrders = ordersData.filter(o => 
          o.status === 'completed' || o.status === 'delivered' || o.status === 'confirmed'
        );
        setOrders(eligibleOrders);
      }
      
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispute = async (e) => {
    e.preventDefault();
    
    if (!disputeForm.orderId || !disputeForm.subject || !disputeForm.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      const order = orders.find(o => o.id === disputeForm.orderId);
      if (!order) {
        alert('Order not found');
        return;
      }

      await firebaseService.disputes?.create({
        orderId: disputeForm.orderId,
        buyerId: currentUser.uid,
        vendorId: order.vendorId,
        type: disputeForm.type,
        subject: disputeForm.subject,
        description: disputeForm.description,
        status: 'pending',
        createdBy: currentUser.uid,
        createdByRole: userType,
        evidence: disputeForm.evidence
      });

      // Send notification to vendor and admin
      await firebaseService.notifications.create({
        userId: order.vendorId,
        type: 'dispute_created',
        title: 'New Dispute Filed',
        message: `A dispute has been filed for order #${order.id.slice(-8)}`,
        orderId: order.id,
        read: false
      });

      alert('Dispute created successfully');
      setShowCreateForm(false);
      setDisputeForm({
        orderId: '',
        type: 'product_issue',
        subject: '',
        description: '',
        evidence: []
      });
      loadData();
      
    } catch (error) {
      console.error('Error creating dispute:', error);
      alert('Failed to create dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddResponse = async (disputeId) => {
    if (!responseText.trim()) {
      alert('Please enter a response');
      return;
    }

    try {
      setSubmitting(true);

      await firebaseService.disputes?.addResponse(disputeId, {
        userId: currentUser.uid,
        userRole: userType,
        message: responseText,
        timestamp: new Date()
      });

      // Get dispute details for notification
      const dispute = disputes.find(d => d.id === disputeId);
      if (dispute) {
        // Notify the other party
        const notifyUserId = userType === 'buyer' ? dispute.vendorId : dispute.buyerId;
        await firebaseService.notifications.create({
          userId: notifyUserId,
          type: 'dispute_response',
          title: 'New Dispute Response',
          message: `A response has been added to dispute #${dispute.id.slice(-8)}`,
          disputeId: dispute.id,
          read: false
        });
      }

      setResponseText('');
      setSelectedDispute(null);
      loadData();
      
    } catch (error) {
      console.error('Error adding response:', error);
      alert('Failed to add response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (disputeId) => {
    if (!confirm('Are you sure you want to escalate this dispute to admin?')) {
      return;
    }

    try {
      await firebaseService.disputes?.update(disputeId, {
        status: 'escalated',
        escalatedAt: new Date(),
        escalatedBy: currentUser.uid
      });

      alert('Dispute escalated to admin review');
      loadData();
      
    } catch (error) {
      console.error('Error escalating dispute:', error);
      alert('Failed to escalate dispute');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'investigating': return 'bg-blue-100 text-blue-800';
      case 'escalated': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dispute Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            {disputes.length} {disputes.length === 1 ? 'dispute' : 'disputes'}
          </p>
        </div>
        {userType === 'buyer' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium"
          >
            File a Dispute
          </button>
        )}
      </div>

      {/* Create Dispute Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">File a Dispute</h3>
            
            <form onSubmit={handleCreateDispute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Order *
                </label>
                <select
                  value={disputeForm.orderId}
                  onChange={(e) => setDisputeForm({ ...disputeForm, orderId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Select an order...</option>
                  {orders.map(order => (
                    <option key={order.id} value={order.id}>
                      Order #{order.id.slice(-8)} - {formatDate(order.createdAt)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dispute Type *
                </label>
                <select
                  value={disputeForm.type}
                  onChange={(e) => setDisputeForm({ ...disputeForm, type: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="product_issue">Product Quality Issue</option>
                  <option value="not_received">Product Not Received</option>
                  <option value="wrong_item">Wrong Item Delivered</option>
                  <option value="damaged">Damaged Product</option>
                  <option value="delivery_issue">Delivery Issue</option>
                  <option value="refund_request">Refund Request</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={disputeForm.subject}
                  onChange={(e) => setDisputeForm({ ...disputeForm, subject: e.target.value })}
                  required
                  placeholder="Brief description of the issue"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={disputeForm.description}
                  onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                  required
                  rows={4}
                  placeholder="Provide detailed information about the issue..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-400"
                >
                  {submitting ? 'Submitting...' : 'Submit Dispute'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disputes List */}
      {disputes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600">No disputes found</p>
          {userType === 'buyer' && (
            <p className="text-sm text-gray-500 mt-2">
              If you have any issues with your orders, you can file a dispute here.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(dispute => (
            <div key={dispute.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {dispute.subject}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(dispute.status)}`}>
                        {dispute.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{dispute.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Dispute #{dispute.id.slice(-8)}</span>
                      <span>Order #{dispute.orderId?.slice(-8)}</span>
                      <span>Filed: {formatDate(dispute.createdAt)}</span>
                      <span className="capitalize">{dispute.type?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {dispute.status === 'pending' && (
                      <button
                        onClick={() => setSelectedDispute(dispute)}
                        className="px-3 py-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Respond
                      </button>
                    )}
                    {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                      <button
                        onClick={() => handleEscalate(dispute.id)}
                        className="px-3 py-1 text-sm font-medium text-orange-600 hover:text-orange-700"
                      >
                        Escalate
                      </button>
                    )}
                  </div>
                </div>

                {/* Responses */}
                {dispute.responses && dispute.responses.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Responses</h4>
                    <div className="space-y-3">
                      {dispute.responses.map((response, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {response.userRole}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(response.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{response.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Respond to Dispute #{selectedDispute.id.slice(-8)}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Subject:</p>
              <p className="text-gray-900 font-medium">{selectedDispute.subject}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Response
              </label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
                placeholder="Enter your response..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleAddResponse(selectedDispute.id)}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-400"
              >
                {submitting ? 'Submitting...' : 'Submit Response'}
              </button>
              <button
                onClick={() => {
                  setSelectedDispute(null);
                  setResponseText('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisputeManagement;

