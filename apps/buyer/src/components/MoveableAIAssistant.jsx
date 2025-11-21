import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import osoahiaService from '../services/osoahiaService';
import performanceMonitor from '../utils/performanceMonitor';

// Constants for optimization
const MAX_MESSAGES = 50; // Limit messages to prevent memory bloat
const MESSAGES_STORAGE_KEY = 'osoahia_messages';
const POSITION_STORAGE_KEY = 'aiAssistantPosition';

// Memoized Message Component for better performance
const MessageComponent = React.memo(({ message, onSuggestionClick, onActionClick }) => {
  const isUser = message.type === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
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
                    loading="lazy"
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
                onClick={() => onActionClick(action)}
                className="bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700 transition-colors no-drag"
                aria-label={action.label}
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
                onClick={() => onSuggestionClick(suggestion)}
                className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-300 transition-colors no-drag"
                aria-label={`Suggestion: ${suggestion}`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.message === nextProps.message.message &&
    JSON.stringify(prevProps.message.products) === JSON.stringify(nextProps.message.products) &&
    JSON.stringify(prevProps.message.suggestions) === JSON.stringify(nextProps.message.suggestions) &&
    JSON.stringify(prevProps.message.actions) === JSON.stringify(nextProps.message.actions)
  );
});

MessageComponent.displayName = 'MessageComponent';

const MoveableAIAssistant = ({ isOpen, onClose, context = null }) => {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Helper function to limit messages and save to localStorage
  const addMessageWithLimit = useCallback((newMessage) => {
    setMessages(prev => {
      const updated = [...prev, newMessage];
      const limited = updated.slice(-MAX_MESSAGES); // Keep only last MAX_MESSAGES
      
      // Save to localStorage asynchronously
      if (currentUser?.uid) {
        try {
          const messagesToSave = limited.map(msg => ({
            ...msg,
            timestamp: msg.timestamp?.toISOString?.() || msg.timestamp
          }));
          localStorage.setItem(`${MESSAGES_STORAGE_KEY}_${currentUser.uid}`, JSON.stringify(messagesToSave));
        } catch (e) {
          console.error('Error saving messages:', e);
        }
      }
      
      return limited;
    });
  }, [currentUser?.uid]);

  // Load messages from localStorage on mount
  useEffect(() => {
    if (currentUser?.uid && isOpen) {
      try {
        const saved = localStorage.getItem(`${MESSAGES_STORAGE_KEY}_${currentUser.uid}`);
        if (saved) {
          const parsedMessages = JSON.parse(saved).map(msg => ({
            ...msg,
            timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
          }));
          // Only restore if we don't already have messages (avoid overwriting active session)
          setMessages(prev => prev.length === 0 ? parsedMessages : prev);
        }
      } catch (e) {
        console.error('Error loading messages:', e);
      }
    }
  }, [currentUser?.uid, isOpen]);
  
  // Load position from localStorage on mount
  const getInitialPosition = useCallback(() => {
    try {
      const saved = localStorage.getItem(POSITION_STORAGE_KEY);
      if (saved) {
        const pos = JSON.parse(saved);
        return { x: pos.x || 20, y: pos.y || 100 };
      }
    } catch (e) {
      console.error('Error loading AI assistant position:', e);
    }
    return { x: 20, y: 100 };
  }, []);

  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef(getInitialPosition());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatRef = useRef(null);
  const abortControllerRef = useRef(null);
  const positionSaveTimerRef = useRef(null);

  // Keep position ref in sync with position state
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Debounced position save to localStorage
  useEffect(() => {
    if (positionSaveTimerRef.current) {
      clearTimeout(positionSaveTimerRef.current);
    }

    positionSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
      } catch (e) {
        console.error('Error saving AI assistant position:', e);
      }
    }, 500);

    return () => {
      if (positionSaveTimerRef.current) {
        clearTimeout(positionSaveTimerRef.current);
      }
    };
  }, [position]);

  // Keep widget within viewport bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      if (chatRef.current) {
        const widgetWidth = chatRef.current.offsetWidth;
        const widgetHeight = chatRef.current.offsetHeight;
        const maxX = window.innerWidth - widgetWidth;
        const maxY = window.innerHeight - widgetHeight;

        setPosition(prev => ({
          x: Math.max(0, Math.min(prev.x, maxX)),
          y: Math.max(0, Math.min(prev.y, maxY))
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMinimized]);

  // Initialize Osoahia when component mounts or user changes
  useEffect(() => {
    if (isOpen && currentUser) {
      initializeOsoahia();
    }

    // Cleanup: cancel any pending requests when component unmounts or closes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, currentUser]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current && !isMinimized) {
      // Use setTimeout to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMinimized]);

  // Scroll to bottom when new messages arrive (throttled)
  useEffect(() => {
    if (!isMinimized && messagesEndRef.current) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isMinimized]);

  const initializeOsoahia = useCallback(async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      const startTime = performanceMonitor.markStart('osoahia-initialize');
      const response = await osoahiaService.initialize(currentUser.uid, userProfile);
      const duration = performanceMonitor.markEnd('osoahia-initialize', startTime);
      performanceMonitor.recordMetric('api', duration);
      
      if (!abortControllerRef.current.signal.aborted && response.success) {
        addMessageWithLimit({
          id: Date.now(),
          type: 'assistant',
          message: response.message,
          timestamp: new Date(),
          suggestions: response.suggestions || []
        });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error initializing Osoahia:', error);
        addMessageWithLimit({
          id: Date.now(),
          type: 'assistant',
          message: "Hello! I'm Osoahia, your AI shopping assistant. How can I help you today?",
          timestamp: new Date(),
          suggestions: ["Search products", "Get recommendations", "Browse categories"]
        });
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [currentUser?.uid, userProfile, addMessageWithLimit]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSendMessage = useCallback(async (message = inputMessage) => {
    if (!message.trim() || isLoading) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: message.trim(),
      timestamp: new Date()
    };

    addMessageWithLimit(userMessage);
    setInputMessage('');
    setIsLoading(true);

    try {
      const startTime = performanceMonitor.markStart('osoahia-message');
      const response = await osoahiaService.processMessage(message.trim(), context);
      performanceMonitor.recordMetric('api', performanceMonitor.markEnd('osoahia-message', startTime));
      
      if (!abortControllerRef.current.signal.aborted) {
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

        addMessageWithLimit(assistantMessage);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sending message:', error);
        const errorMessage = {
          id: Date.now() + 1,
          type: 'assistant',
          message: "I apologize, but I'm having trouble processing your request. Please try again.",
          timestamp: new Date(),
          suggestions: ["Try again", "Get help", "Browse products"]
        };
        addMessageWithLimit(errorMessage);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [inputMessage, isLoading, context, addMessageWithLimit]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleSuggestionClick = useCallback((suggestion) => {
    handleSendMessage(suggestion);
  }, [handleSendMessage]);

  const handleActionClick = useCallback((action) => {
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
  }, []);

  // Throttled drag handlers
  const handleMouseDown = useCallback((e) => {
    // Don't drag if clicking on buttons, inputs, or interactive elements
    if (e.target.closest('.no-drag') || 
        e.target.closest('button') || 
        e.target.closest('input') || 
        e.target.closest('a')) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y
    };
  }, []);

  // Throttled mouse move handler
  const mouseMoveHandlerRef = useRef(null);
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    e.preventDefault();
    
    // Throttle mouse move for better performance
    if (mouseMoveHandlerRef.current) {
      cancelAnimationFrame(mouseMoveHandlerRef.current);
    }

    mouseMoveHandlerRef.current = requestAnimationFrame(() => {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;

      // Get widget dimensions
      const widgetWidth = chatRef.current?.offsetWidth || (isMinimized ? 200 : 400);
      const widgetHeight = chatRef.current?.offsetHeight || (isMinimized ? 60 : 500);

      // Keep within viewport bounds
      const maxX = window.innerWidth - widgetWidth;
      const maxY = window.innerHeight - widgetHeight;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    });
  }, [isDragging, isMinimized]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (mouseMoveHandlerRef.current) {
      cancelAnimationFrame(mouseMoveHandlerRef.current);
    }
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e) => {
    // Don't drag if clicking on buttons, inputs, or interactive elements
    if (e.target.closest('.no-drag') || 
        e.target.closest('button') || 
        e.target.closest('input') || 
        e.target.closest('a')) {
      return;
    }

    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX - positionRef.current.x,
      y: touch.clientY - positionRef.current.y
    };
  }, []);

  const touchMoveHandlerRef = useRef(null);
  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;

    e.preventDefault();

    // Throttle touch move for better performance
    if (touchMoveHandlerRef.current) {
      cancelAnimationFrame(touchMoveHandlerRef.current);
    }

    touchMoveHandlerRef.current = requestAnimationFrame(() => {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStartRef.current.x;
      const newY = touch.clientY - dragStartRef.current.y;

      // Get widget dimensions
      const widgetWidth = chatRef.current?.offsetWidth || (isMinimized ? 200 : 400);
      const widgetHeight = chatRef.current?.offsetHeight || (isMinimized ? 60 : 500);

      // Keep within viewport bounds
      const maxX = window.innerWidth - widgetWidth;
      const maxY = window.innerHeight - widgetHeight;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    });
  }, [isDragging, isMinimized]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (touchMoveHandlerRef.current) {
      cancelAnimationFrame(touchMoveHandlerRef.current);
    }
  }, []);

  // Add event listeners for dragging (mouse)
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        if (mouseMoveHandlerRef.current) {
          cancelAnimationFrame(mouseMoveHandlerRef.current);
        }
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Add event listeners for dragging (touch)
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        if (touchMoveHandlerRef.current) {
          cancelAnimationFrame(touchMoveHandlerRef.current);
        }
      };
    }
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  // Memoized rendered messages for better performance
  const renderedMessages = useMemo(() => {
    const startTime = performanceMonitor.markStart('render-messages');
    const result = messages.map((message) => (
      <MessageComponent
        key={message.id}
        message={message}
        onSuggestionClick={handleSuggestionClick}
        onActionClick={handleActionClick}
      />
    ));
    performanceMonitor.recordMetric('render', performanceMonitor.markEnd('render-messages', startTime));
    return result;
  }, [messages, handleSuggestionClick, handleActionClick]);

  // Log performance metrics periodically (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && messages.length > 0 && messages.length % 10 === 0) {
      performanceMonitor.logSummary();
    }
  }, [messages.length]);

  // Memoize widget style
  const widgetStyle = useMemo(() => ({
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
    transition: isDragging ? 'none' : 'transform 0.2s ease'
  }), [position, isDragging]);

  if (!isOpen) return null;

  return (
    <div
      ref={chatRef}
      className="fixed z-50 select-none"
      style={widgetStyle}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header - Draggable area */}
        <div
          className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white cursor-move"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
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
              className="text-emerald-100 hover:text-white transition-colors p-1 no-drag"
              title={isMinimized ? "Expand" : "Minimize"}
              aria-label={isMinimized ? "Expand" : "Minimize"}
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
              className="text-emerald-100 hover:text-white transition-colors p-1 no-drag"
              title="Close"
              aria-label="Close"
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
              {renderedMessages}

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
                  aria-label="Message input"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm no-drag"
                  aria-label="Send message"
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

export default React.memo(MoveableAIAssistant);
