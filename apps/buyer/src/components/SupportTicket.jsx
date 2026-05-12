import { useState } from 'react';
import { motion } from 'framer-motion';
import firebaseService from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';

const SupportTicket = ({ onTicketCreated, onClose, initialData = {} }) => {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Pre-fill form with initial data (order, transaction, etc.)
  const getInitialCategory = () => {
    if (initialData.orderId) return 'order';
    if (initialData.transactionId) return 'payment';
    return initialData.category || 'general';
  };

  const getInitialSubject = () => {
    if (initialData.orderId) return `Issue with Order ${initialData.orderId.slice(-8)}`;
    if (initialData.transactionId) return `Issue with Transaction ${initialData.transactionId.slice(-8)}`;
    return initialData.subject || '';
  };

  const getInitialDescription = () => {
    let desc = initialData.description || '';
    if (initialData.orderId) {
      desc = `I'm reporting an issue with my order ${initialData.orderId.slice(-8)}.\n\n`;
      if (initialData.orderDetails) {
        desc += `Order Details:\n- Amount: ${initialData.orderDetails.amount || 'N/A'}\n- Status: ${initialData.orderDetails.status || 'N/A'}\n- Vendor: ${initialData.orderDetails.vendorName || 'N/A'}\n\n`;
      }
      desc += 'Issue Description:\n';
    }
    if (initialData.transactionId) {
      desc = `I'm reporting an issue with my transaction ${initialData.transactionId.slice(-8)}.\n\n`;
      if (initialData.transactionDetails) {
        desc += `Transaction Details:\n- Amount: ${initialData.transactionDetails.amount || 'N/A'}\n- Type: ${initialData.transactionDetails.type || 'N/A'}\n- Status: ${initialData.transactionDetails.status || 'N/A'}\n\n`;
      }
      desc += 'Issue Description:\n';
    }
    return desc;
  };
  
  const [formData, setFormData] = useState({
    subject: getInitialSubject(),
    category: getInitialCategory(),
    priority: initialData.priority || 'medium',
    description: getInitialDescription(),
    orderId: initialData.orderId || '',
    transactionId: initialData.transactionId || '',
    attachments: []
  });

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'order', label: 'Order Issue' },
    { value: 'payment', label: 'Payment Problem' },
    { value: 'delivery', label: 'Delivery Issue' },
    { value: 'refund', label: 'Refund Request' },
    { value: 'account', label: 'Account Issue' },
    { value: 'technical', label: 'Technical Problem' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-blue-400' },
    { value: 'medium', label: 'Medium', color: 'text-amber-400' },
    { value: 'high', label: 'High', color: 'text-orange-400' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-400' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.subject.trim() || !formData.description.trim()) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const ticketData = {
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.email || 'User',
        userEmail: currentUser.email,
        subject: formData.subject,
        category: formData.category,
        priority: formData.priority,
        description: formData.description,
        orderId: formData.orderId || null,
        transactionId: formData.transactionId || null,
        status: 'open',
        attachments: formData.attachments,
        relatedData: initialData.orderDetails || initialData.transactionDetails || null
      };

      const ticketId = await firebaseService.supportTickets.create(ticketData);

      // Notify admins
      const admins = await firebaseService.users.getAdmins();
      for (const admin of admins) {
        await firebaseService.notifications.create({
          userId: admin.uid,
          type: 'support_ticket_created',
          title: 'New Support Ticket',
          message: `New ${formData.priority} priority ticket: ${formData.subject}`,
          ticketId: ticketId,
          read: false
        });
      }

      setSuccess(true);
      setTimeout(() => {
        if (onTicketCreated) onTicketCreated(ticketId);
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      console.error('Error creating support ticket:', err);
      setError('Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 rounded-xl p-8 text-center"
      >
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-emerald-400 mb-2">Ticket Created!</h3>
        <p className="text-teal-200">Your support ticket has been submitted successfully. We'll get back to you soon.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 rounded-xl border border-teal-800/50 p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Create Support Ticket</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-teal-300 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-teal-300 mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-teal-700/60 text-teal-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
            required
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-teal-300 mb-2">
            Priority *
          </label>
          <div className="grid grid-cols-4 gap-2">
            {priorities.map(pri => (
              <button
                key={pri.value}
                type="button"
                onClick={() => setFormData({ ...formData, priority: pri.value })}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  formData.priority === pri.value
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-slate-800 border-teal-700/60 text-teal-300 hover:border-teal-600'
                }`}
              >
                {pri.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-teal-300 mb-2">
            Subject *
          </label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Brief description of your issue"
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-teal-700/60 text-teal-50 placeholder-teal-300/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
            required
          />
        </div>

        {(formData.orderId || formData.transactionId) && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-teal-700/30">
            <p className="text-sm text-teal-300 mb-2">Related Information:</p>
            {formData.orderId && (
              <p className="text-sm text-white">
                <span className="text-teal-300">Order ID:</span> {formData.orderId}
              </p>
            )}
            {formData.transactionId && (
              <p className="text-sm text-white">
                <span className="text-teal-300">Transaction ID:</span> {formData.transactionId}
              </p>
            )}
          </div>
        )}
        
        {!formData.orderId && !formData.transactionId && (
          <div>
            <label className="block text-sm font-medium text-teal-300 mb-2">
              Order ID (if related to an order)
            </label>
            <input
              type="text"
              value={formData.orderId}
              onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
              placeholder="Optional: Enter order ID if this is order-related"
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-teal-700/60 text-teal-50 placeholder-teal-300/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-teal-300 mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Please provide detailed information about your issue..."
            rows={6}
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-teal-700/60 text-teal-50 placeholder-teal-300/60 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            required
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Ticket...' : 'Submit Ticket'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-lg font-semibold bg-slate-800 border border-teal-700/60 text-teal-300 hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default SupportTicket;

