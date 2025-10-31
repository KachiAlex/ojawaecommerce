import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const MessageVendorModal = ({ isOpen, onClose, vendor, product, cartItems = null }) => {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [vendorName, setVendorName] = useState(vendor?.name || 'Vendor');
  const [vendorId, setVendorId] = useState(vendor?.id || product?.vendorId || null);

  // Fetch vendor name from Firestore if not provided
  useEffect(() => {
    const fetchVendorName = async () => {
      if (!vendorId || vendor?.name) return; // Skip if vendor name already provided or no vendorId
      
      try {
        const vendorDoc = await getDoc(doc(db, 'users', vendorId));
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          const name = vendorData.displayName || 
                      vendorData.name || 
                      vendorData.businessName || 
                      vendorData.storeName ||
                      vendorData.email?.split('@')[0] ||
                      'Vendor';
          setVendorName(name);
        }
      } catch (error) {
        console.error('Error fetching vendor name:', error);
      }
    };

    if (isOpen && vendorId) {
      fetchVendorName();
    }
  }, [isOpen, vendorId, vendor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }
    
    if (!currentUser) {
      alert('Please log in to send messages');
      return;
    }

    setLoading(true);
    try {
      // Create message object
      const messageData = {
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || currentUser.email,
        toUserId: vendorId || vendor?.id || product?.vendorId || 'vendor-id',
        toUserName: vendorName || vendor?.name || 'Vendor',
        message: message.trim(),
        productId: product?.id || null,
        productName: product?.name || null,
        cartItems: cartItems || null,
        type: cartItems ? 'cart_inquiry' : 'product_inquiry',
        status: 'unread',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('Sending message:', messageData);

      // Save to Firestore
      await addDoc(collection(db, 'messages'), messageData);
      
      console.log('Message sent successfully');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setMessage('');
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultMessage = () => {
    if (cartItems && cartItems.length > 0) {
      const productList = cartItems.map(item => `- ${item.name} (Qty: ${item.quantity})`).join('\n');
      return `Hi! I'm interested in purchasing these products directly from you instead of using logistics:\n\n${productList}\n\nCould you please provide more details about direct pickup/delivery options and pricing?`;
    } else if (product) {
      return `Hi! I'm interested in your product "${product.name}". Could you please provide more details about availability and pricing?`;
    }
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Message Vendor
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {(vendorId || vendor || product?.vendorId) && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>To:</strong> {vendorName || vendor?.name || 'Vendor'}
              </p>
              {product && (
                <p className="text-sm text-gray-600">
                  <strong>Product:</strong> {product.name}
                </p>
              )}
            </div>
          )}

          {success ? (
            <div className="text-center py-8">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Message Sent!</h3>
              <p className="text-gray-600">The vendor will receive your message and respond soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={getDefaultMessage()}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={6}
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageVendorModal;
