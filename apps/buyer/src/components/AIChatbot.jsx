import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MobileBottomSheet from './MobileBottomSheet';

const AIChatbot = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const quickActions = [
    { label: 'Track Order', action: 'track_order' },
    { label: 'Wallet Balance', action: 'wallet_balance' },
    { label: 'Recent Orders', action: 'recent_orders' },
    { label: 'Help Center', action: 'help_center' }
  ];

  useEffect(() => {
    if (isOpen) {
      // Initialize with welcome message
      setMessages([
        {
          id: 1,
          type: 'bot',
          message: `Hello ${currentUser?.displayName || 'there'}! I'm your AI assistant. How can I help you today?`,
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const botResponse = generateAIResponse(input.trim());
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        message: botResponse.message,
        timestamp: new Date(),
        actions: botResponse.actions
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('order') || input.includes('track')) {
      return {
        message: "I can help you track your orders. Here are your recent orders:",
        actions: [
          { type: 'button', label: 'View All Orders', action: 'view_orders' },
          { type: 'button', label: 'Track Specific Order', action: 'track_order' }
        ]
      };
    }
    
    if (input.includes('wallet') || input.includes('balance')) {
      return {
        message: "Your current wallet balance is ₦25,000. Would you like to add funds or view transaction history?",
        actions: [
          { type: 'button', label: 'Add Funds', action: 'add_funds' },
          { type: 'button', label: 'Transaction History', action: 'transaction_history' }
        ]
      };
    }
    
    if (input.includes('help') || input.includes('support')) {
      return {
        message: "I'm here to help! Here are some common topics:",
        actions: [
          { type: 'button', label: 'How to Order', action: 'help_ordering' },
          { type: 'button', label: 'Payment Issues', action: 'help_payment' },
          { type: 'button', label: 'Delivery Problems', action: 'help_delivery' },
          { type: 'button', label: 'Contact Support', action: 'contact_support' }
        ]
      };
    }
    
    if (input.includes('product') || input.includes('search')) {
      return {
        message: "I can help you find products. What are you looking for?",
        actions: [
          { type: 'button', label: 'Browse Categories', action: 'browse_categories' },
          { type: 'button', label: 'Search Products', action: 'search_products' },
          { type: 'button', label: 'Featured Products', action: 'featured_products' }
        ]
      };
    }
    
    // Default response
    return {
      message: "I understand you're looking for help. Let me connect you with the right information. What specific area can I assist you with?",
      actions: [
        { type: 'button', label: 'Orders & Tracking', action: 'orders' },
        { type: 'button', label: 'Wallet & Payments', action: 'payments' },
        { type: 'button', label: 'Products & Shopping', action: 'shopping' },
        { type: 'button', label: 'Account & Settings', action: 'account' }
      ]
    };
  };

  const handleQuickAction = (action) => {
    setInput(action);
    handleSendMessage({ preventDefault: () => {} });
  };

  const handleActionButton = (action) => {
    // Handle specific actions
    console.log('Action clicked:', action);
    // Implement specific action handling here
  };

  const isMobile = window.innerWidth < 768;

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-emerald-600 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-medium">AI Assistant</h3>
            <p className="text-sm text-emerald-100">Always here to help</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-white hover:bg-emerald-700 rounded-full"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              <p className="text-sm">{message.message}</p>
              {message.actions && (
                <div className="mt-2 space-y-1">
                  {message.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleActionButton(action.action)}
                      className="block w-full text-left px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickActions.map((action) => (
            <button
              key={action.action}
              onClick={() => handleQuickAction(action.label)}
              className="px-3 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="AI Assistant"
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

export default AIChatbot;
