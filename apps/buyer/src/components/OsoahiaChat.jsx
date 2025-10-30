import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import osoahiaService from '../services/osoahiaService';

const OsoahiaChat = ({ isOpen, onClose, context = null }) => {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize Osoahia when component mounts or user changes
  useEffect(() => {
    if (isOpen && currentUser) {
      initializeOsoahia();
    }
  }, [isOpen, currentUser]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Watch for typing indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTyping(osoahiaService.isTypingResponse());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const initializeOsoahia = async () => {
    try {
      setIsLoading(true);
      const response = await osoahiaService.initialize(currentUser.uid, userProfile);
      
      if (response.success) {
        setMessages([{
          id: Date.now(),
          type: 'assistant',
          message: response.message,
          timestamp: new Date(),
          suggestions: response.suggestions || []
        }]);
      }
    } catch (error) {
      console.error('Error initializing Osoahia:', error);
      setMessages([{
        id: Date.now(),
        type: 'assistant',
        message: "Hello! I'm Osoahia, your AI shopping assistant. How can I help you today?",
        timestamp: new Date(),
        suggestions: ["Search products", "Get recommendations", "Browse categories"]
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: message.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await osoahiaService.processMessage(message.trim(), context);
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        message: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions || [],
        actions: response.actions || [],
        products: response.products || [],
        recommendations: response.recommendations || [],
        comparison: response.comparison || null,
        product: response.product || null,
        helpTopics: response.helpTopics || [],
        helpContent: response.helpContent || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        message: "I apologize, but I'm having trouble processing your request. Please try again.",
        timestamp: new Date(),
        suggestions: ["Try again", "Get help", "Browse products"]
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  const handleActionClick = (action) => {
    // Handle different action types
    switch (action.type) {
      case 'view_all':
        // Navigate to search results
        navigate(`/products?search=${action.data.searchTerm}`);
        break;
      case 'view_product':
        // Navigate to product detail
        navigate(`/products/${action.data.productId}`);
        break;
      case 'add_to_cart':
        // Add to cart functionality
        console.log('Add to cart:', action.data);
        break;
      case 'view_cart':
        // Navigate to cart
        navigate('/cart');
        break;
      case 'go_to_checkout':
        // Navigate to checkout
        navigate('/checkout');
        break;
      default:
        console.log('Action:', action);
    }
  };

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser 
            ? 'bg-emerald-600 text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <p className="text-sm">{message.message}</p>
          
          {/* Render products */}
          {message.products && message.products.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.products.map((product, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                      onError={(e) => {
                        e.target.src = '/placeholder-product.png';
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900">{product.name}</h4>
                      <p className="text-emerald-600 font-semibold">{product.price}</p>
                      <p className="text-xs text-gray-500">{product.category}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Render recommendations */}
          {message.recommendations && message.recommendations.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.recommendations.map((rec, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <img 
                      src={rec.image || rec.images?.[0]} 
                      alt={rec.name}
                      className="w-12 h-12 object-cover rounded"
                      onError={(e) => {
                        e.target.src = '/placeholder-product.png';
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900">{rec.name}</h4>
                      <p className="text-emerald-600 font-semibold">{rec.price}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-xs text-gray-500">{rec.rating || 4.0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Render product comparison */}
          {message.comparison && (
            <div className="mt-3 bg-white p-3 rounded-lg border">
              <h4 className="font-medium text-sm text-gray-900 mb-2">Product Comparison</h4>
              <div className="space-y-2">
                {message.comparison.products.map((product, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <img 
                      src={product.image || product.images?.[0]} 
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded"
                      onError={(e) => {
                        e.target.src = '/placeholder-product.png';
                      }}
                    />
                    <div className="flex-1">
                      <h5 className="font-medium text-xs text-gray-900">{product.name}</h5>
                      <p className="text-emerald-600 text-xs font-semibold">{product.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render product info */}
          {message.product && (
            <div className="mt-3 bg-white p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <img 
                  src={message.product.image || message.product.images?.[0]} 
                  alt={message.product.name}
                  className="w-16 h-16 object-cover rounded"
                  onError={(e) => {
                    e.target.src = '/placeholder-product.png';
                  }}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-gray-900">{message.product.name}</h4>
                  <p className="text-emerald-600 font-semibold">{message.product.price}</p>
                  <p className="text-xs text-gray-500">{message.product.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-yellow-400">⭐</span>
                    <span className="text-xs text-gray-500">{message.product.rating || 4.0}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{message.product.category}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Render help content */}
          {message.helpContent && message.helpContent.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.helpContent.map((help, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border">
                  <h4 className="font-medium text-sm text-gray-900 mb-2">{help.title}</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {help.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-0.5">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Render actions */}
          {message.actions && message.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleActionClick(action)}
                  className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs hover:bg-emerald-700 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Render suggestions */}
          {message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs hover:bg-gray-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-emerald-600 text-xl">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Osoahia</h3>
              <p className="text-sm text-gray-500">AI Shopping Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(renderMessage)}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">Osoahia is typing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Osoahia anything..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-12"
                disabled={isLoading}
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                </div>
              )}
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
          
          {/* Quick suggestions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Find laptops",
              "Show recommendations",
              "Help with cart",
              "Browse categories"
            ].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs hover:bg-gray-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OsoahiaChat;
