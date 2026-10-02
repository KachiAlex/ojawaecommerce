import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import osoahiaService from '../services/osoahiaService';

const OsoahiaWidget = () => {
  const { currentUser, userProfile } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadSuggestions();
    }
  }, [currentUser]);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      
      // Initialize Osoahia and get initial suggestions
      const response = await osoahiaService.initialize(currentUser.uid, userProfile);
      
      if (response.success) {
        setSuggestions(response.suggestions || []);
      }
    } catch (error) {
      console.error('Error loading Osoahia suggestions:', error);
      setSuggestions([
        "Search for products",
        "Get recommendations", 
        "Browse categories",
        "View popular items"
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    try {
      const response = await osoahiaService.processMessage(suggestion);
      
      // Handle the response - in a real app, you might navigate or show results
      if (response.products && response.products.length > 0) {
        // Navigate to search results
        window.location.href = `/products?search=${suggestion}`;
      } else if (response.recommendations && response.recommendations.length > 0) {
        // Navigate to recommendations page
        window.location.href = '/products?featured=true';
      } else {
        // Open chat for more interaction
        setShowChat(true);
      }
    } catch (error) {
      console.error('Error processing suggestion:', error);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 border border-emerald-200">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">🤖</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Meet Osoahia</h3>
          <p className="text-sm text-gray-600">Your AI shopping assistant</p>
        </div>
      </div>
      
      <p className="text-gray-700 mb-4">
        Hi{userProfile?.displayName ? ` ${userProfile.displayName.split(' ')[0]}` : ''}! I'm here to help you find the perfect products. 
        Ask me anything or try one of these suggestions:
      </p>
      
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
          <span className="text-sm text-gray-600">Loading suggestions...</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="bg-white text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors border border-emerald-200 hover:border-emerald-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowChat(true)}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Chat with Osoahia
          </button>
        </div>
      )}
      
      {/* Quick Chat Interface */}
      {showChat && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-900">Quick Chat</span>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-400 hover:text-gray-600 ml-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-700">
                👋 Hi! I'm ready to help you shop. What are you looking for today?
              </p>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSuggestionClick(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={() => setShowChat(false)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors"
              >
                Ask
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OsoahiaWidget;
