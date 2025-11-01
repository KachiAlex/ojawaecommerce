import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../contexts/MessagingContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const Messages = () => {
  const { currentUser } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    sendMessage,
    markAsRead,
    unreadCount,
    loading,
    startConversation,
  } = useMessaging();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const [otherParticipantName, setOtherParticipantName] = useState('');

  // Check for pending vendor message from sessionStorage after login
  useEffect(() => {
    if (!currentUser || !startConversation) return;
    
    // If activeConversation is already set, don't override it
    if (activeConversation) return;
    
    try {
      const pendingMessage = sessionStorage.getItem('pendingVendorMessage');
      if (pendingMessage) {
        const { vendorId, timestamp } = JSON.parse(pendingMessage);
        
        // Only process if less than 5 minutes old
        if (Date.now() - timestamp < 300000) {
          sessionStorage.removeItem('pendingVendorMessage');
          
          // Check if conversation already exists
          const existingConv = conversations?.find(conv => 
            conv.participants?.includes(vendorId) && conv.participants?.includes(currentUser.uid)
          );
          
          if (existingConv) {
            setActiveConversation(existingConv);
          } else {
            // Start new conversation with vendor
            startConversation(vendorId).then((conv) => {
              setActiveConversation(conv);
            }).catch((err) => {
              console.error('Failed to start conversation from Messages page:', err);
            });
          }
        } else {
          // Clear stale pending message
          sessionStorage.removeItem('pendingVendorMessage');
        }
      }
    } catch (err) {
      console.error('Error checking pending vendor message in Messages:', err);
    }
  }, [currentUser, startConversation, conversations, activeConversation, setActiveConversation]);

  useEffect(() => {
    if (activeConversation) {
      markAsRead(activeConversation.id).catch(() => {});
    }
  }, [activeConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || !activeConversation || sending) return;
    try {
      setSending(true);
      await sendMessage(activeConversation.id, text);
      setInput('');
    } finally {
      setSending(false);
    }
  };

  const otherParticipantId = useMemo(() => {
    if (!activeConversation || !currentUser) return null;
    return (activeConversation.participants || []).find((p) => p !== currentUser.uid) || null;
  }, [activeConversation, currentUser?.uid]);

  // Resolve other participant's display name (vendor or user)
  useEffect(() => {
    const fetchName = async () => {
      try {
        if (!otherParticipantId) {
          setOtherParticipantName('');
          return;
        }
        const userRef = doc(db, 'users', otherParticipantId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const vendorName = data.vendorProfile?.businessName || data.storeName || data.displayName || data.name || data.email;
          setOtherParticipantName(vendorName || otherParticipantId);
        } else {
          setOtherParticipantName(otherParticipantId);
        }
      } catch (_) {
        setOtherParticipantName(otherParticipantId || '');
      }
    };
    fetchName();
  }, [otherParticipantId]);

  return (
    <motion.div className="min-h-screen bg-gray-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 text-sm">Chat with vendors and buyers in real-time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Conversations list */}
          <div className="bg-white rounded-xl shadow-sm border lg:col-span-1 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Conversations</div>
              {unreadCount > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{unreadCount} unread</span>
              )}
            </div>
            <div className="max-h-[60vh] lg:max-h-[70vh] overflow-y-auto">
              {loading && conversations.length === 0 && (
                <div className="p-4 text-gray-500 text-sm">Loading conversations...</div>
              )}
              {conversations.length === 0 && !loading && (
                <div className="p-6 text-center text-gray-500 text-sm">No conversations yet</div>
              )}
              <ul>
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <button
                      onClick={() => setActiveConversation(conv)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition ${activeConversation?.id === conv.id ? 'bg-gray-50' : ''}`}
                    >
                      <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">💬</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900 truncate">Conversation</div>
                          {conv.updatedAt && <div className="text-xs text-gray-500">{new Date(conv.updatedAt.toDate?.() || conv.updatedAt).toLocaleDateString()}</div>}
                        </div>
                        <div className="text-sm text-gray-600 truncate">{conv.lastMessage?.content || 'Tap to start chatting'}</div>
                      </div>
                      {!!conv.unreadCount && (
                        <span className="ml-2 bg-emerald-600 text-white text-xs rounded-full h-5 px-2 flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Chat pane */}
          <div className="bg-white rounded-xl shadow-sm border lg:col-span-2 flex flex-col min-h-[60vh] lg:min-h-[70vh]">
            {activeConversation ? (
              <>
                <div className="p-4 border-b flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">👤</div>
                  <div>
                    <div className="font-semibold text-gray-900">Chat</div>
                    {otherParticipantId && (
                      <div className="text-xs text-gray-500">To: {otherParticipantName || otherParticipantId}</div>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages
                    .slice()
                    .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0))
                    .map((msg) => {
                      const mine = msg.senderId === currentUser?.uid;
                      return (
                        <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`${mine ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-900'} px-3 py-2 rounded-2xl max-w-[80%] whitespace-pre-wrap break-words`}>{msg.content}</div>
                        </div>
                      );
                    })}
                  <div ref={bottomRef} />
                </div>
                <form onSubmit={handleSend} className="p-3 border-t flex items-end gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-6">Select a conversation to start chatting</div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Messages;


