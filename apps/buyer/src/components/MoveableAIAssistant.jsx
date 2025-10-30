import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import osoahiaService from '../services/osoahiaService';

const MoveableAIAssistant = ({ isOpen, onClose, context = null }) => {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);

  // Initialize Osoahia when component mounts or user changes
  useEffect(() => {
    if (isOpen && currentUser) {
      initializeOsoahia();
    }
  }, [isOpen, currentUser]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current && !isMinimized) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isMinimized) {
      scrollToBottom();
    }
  }, [messages, isMinimized]);

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
    switch (action.type) {
      case 'view_all':
        window.location.href = `/products?search=${action.data.searchTerm}`;
        break;
      case 'view_product':
        window.location.href = `/products/${action.data.productId}`;
        break;
      case 'add_to_cart':
        console.log('Add to cart:', action.data);
        break;
      case 'view_cart':
        window.location.href = '/cart';
        break;
      case 'go_to_checkout':
        window.location.href = '/checkout';
        break;
      default:
        console.log('Action:', action);
    }
  };

  // Drag functionality
  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) return; // Don't drag if clicking on input/buttons
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Keep within viewport bounds
    const maxX = window.innerWidth - (isMinimized ? 200 : 400);
    const maxY = window.innerHeight - (isMinimized ? 60 : 500);

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
          isUser 
            ? 'bg-emerald-600 text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <p>{message.message}</p>
          
          {/* Render products */}
          {message.products && message.products.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.products.slice(0, 2).map((product, index) => (
                <div key={index} className="bg-white p-2 rounded border text-xs">
                  <div className="flex items-center gap-2">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-8 h-8 object-cover rounded"
                      onError={(e) => {
                        e.target.src = '/placeholder-product.png';
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                      <p className="text-emerald-600 font-semibold">{product.price}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Render actions */}
          {message.actions && message.actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.actions.slice(0, 2).map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleActionClick(action)}
                  className="bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Render suggestions */}
          {message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.suggestions.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-300 transition-colors"
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
    <div
      ref={chatRef}
      className="fixed z-50 select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.2s ease'
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header - Draggable area */}
        <div 
          className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white cursor-move"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-emerald-100 text-lg">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Osoahia</h3>
              <p className="text-xs text-emerald-100">AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-emerald-100 hover:text-white transition-colors p-1"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMinimized ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-emerald-100 hover:text-white transition-colors p-1"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat Content */}
        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="h-80 overflow-y-auto p-3 space-y-2 bg-gray-50">
              {messages.map(renderMessage)}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-1">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-500 ml-2">Typing...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-200 bg-white">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Osoahia..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 no-drag"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm no-drag"
                >
                  Send
                </button>
              </div>
              
              {/* Quick suggestions */}
              <div className="mt-2 flex flex-wrap gap-1">
                {[
                  "Find products",
                  "Get help",
                  "View cart"
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-200 transition-colors no-drag"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile-specific styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .fixed {
            max-width: calc(100vw - 20px) !important;
            max-height: calc(100vh - 40px) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MoveableAIAssistant;
