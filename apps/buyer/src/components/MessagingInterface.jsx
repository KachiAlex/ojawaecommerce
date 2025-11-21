import { useState, useEffect, useRef } from 'react';
import { useMessaging } from '../contexts/MessagingContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import MobileBottomSheet from './MobileBottomSheet';
import MobileTouchHandler from './MobileTouchHandler';

const MessagingInterface = ({ isOpen, onClose, order = null, otherUserId = null }) => {
  const { currentUser } = useAuth();
  const { 
    conversations, 
    activeConversation, 
    messages, 
    loading, 
    unreadCount,
    setActiveConversation,
    startConversation,
    sendMessage,
    markAsRead
  } = useMessaging();
  
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [senderNames, setSenderNames] = useState({}); // Cache sender names

  const emojis = ['😊', '👍', '👎', '❤️', '😢', '😡', '🎉', '🤔', '👌', '🙏'];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Fetch sender names for all messages
  useEffect(() => {
    if (!messages || messages.length === 0 || !currentUser) return;
    
    const fetchSenderNames = async () => {
      const uniqueSenderIds = [...new Set(messages.map(msg => msg.senderId).filter(Boolean))];
      
      // Use functional update to check current state without including in dependencies
      setSenderNames(prev => {
        const namesToFetch = uniqueSenderIds.filter(id => !prev[id]);
        
        if (namesToFetch.length === 0) return prev;
        
        // Fetch names asynchronously and update state
        (async () => {
          const namePromises = namesToFetch.map(async (senderId) => {
            try {
              const userRef = doc(db, 'users', senderId);
              const snap = await getDoc(userRef);
              if (snap.exists()) {
                const data = snap.data();
                // Get display name - prioritize vendor/business name, then display name, then email
                const displayName = data.vendorProfile?.businessName || 
                                   data.vendorProfile?.storeName ||
                                   data.displayName || 
                                   data.name || 
                                   data.email?.split('@')[0] || 
                                   senderId;
                return { senderId, displayName };
              }
              return { senderId, displayName: senderId };
            } catch (error) {
              console.warn('Error fetching sender name:', error);
              return { senderId, displayName: senderId };
            }
          });
          
          const names = await Promise.all(namePromises);
          setSenderNames(current => {
            const updated = { ...current };
            names.forEach(({ senderId, displayName }) => {
              updated[senderId] = displayName;
            });
            return updated;
          });
        })();
        
        return prev; // Return current state immediately
      });
    };
    
    fetchSenderNames();
  }, [messages, currentUser]);

  // Initialize conversation when component opens
  useEffect(() => {
    if (isOpen && !activeConversation) {
      if (order && order.vendorId) {
        initializeConversation(order.vendorId, order.id);
      } else if (otherUserId) {
        initializeConversation(otherUserId);
      }
    }
  }, [isOpen, order, otherUserId]);

  const initializeConversation = async (userId, orderId = null) => {
    try {
      const conversation = await startConversation(userId, orderId);
      setActiveConversation(conversation);
    } catch (error) {
      console.error('Error initializing conversation:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || sending) return;

    setSending(true);
    try {
      await sendMessage(activeConversation.id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSendEmoji = async (emoji) => {
    if (!activeConversation || sending) return;

    setSending(true);
    try {
      await sendMessage(activeConversation.id, emoji, 'emoji');
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending emoji:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConversation) return;

    setSending(true);
    try {
      await firebaseService.messaging.sendFileMessage(activeConversation.id, file, currentUser.uid);
    } catch (error) {
      console.error('Error sending file:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = timestamp?.toDate?.() || new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getOtherParticipant = () => {
    if (!activeConversation) return null;
    return activeConversation.participants.find(p => p !== currentUser.uid);
  };

  const isMobile = window.innerWidth < 768;

  if (!isOpen) return null;

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-emerald-600 font-medium">
              {getOtherParticipant()?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {order ? `Vendor - Order #${order.id}` : 'Chat'}
            </h3>
            <p className="text-sm text-gray-500">Online</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === currentUser.uid;
            const senderName = senderNames[message.senderId] || (mine ? 'You' : 'Unknown');
            
            return (
              <div
                key={message.id}
                className={`flex flex-col ${mine ? 'items-end' : 'items-start'} mb-3`}
              >
                {/* Sender name - only show if not current user */}
                {!mine && (
                  <div className="mb-1 px-2">
                    <span className="text-xs font-medium text-gray-600">
                      {senderName}
                    </span>
                  </div>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      mine
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    {message.type === 'image' ? (
                      <img
                        src={message.content}
                        alt="Shared image"
                        className="max-w-full h-auto rounded"
                        onClick={() => window.open(message.content, '_blank')}
                      />
                    ) : message.type === 'file' ? (
                      <div className="flex items-center space-x-2">
                        <span>📎</span>
                        <a
                          href={message.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {message.fileName}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <p className={`text-xs mt-1 ${
                      mine ? 'text-emerald-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <span className="text-xl">😊</span>
          </button>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx"
          />
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={sending}
          />
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
        
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="mt-2 p-2 bg-gray-100 rounded-lg">
            <div className="flex flex-wrap gap-2">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendEmoji(emoji)}
                  className="text-xl hover:bg-gray-200 rounded p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Messages"
        snapPoints={[0.7, 0.95]}
      >
        {content}
      </MobileBottomSheet>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-xl">
        {content}
      </div>
    </div>
  );
};

export default MessagingInterface;
