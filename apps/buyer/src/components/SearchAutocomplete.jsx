import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

const SearchAutocomplete = ({ onSelect, placeholder = "Search products..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVoiceSearch, setShowVoiceSearch] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const searchRef = useRef(null);
  const recognitionRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setShowVoiceSearch(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchTerm(transcript);
        setIsListening(false);
        searchProducts(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchProducts = async (term) => {
    if (!term || term.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    try {
      setLoading(true);
      const productsRef = collection(db, 'products');
      const q = query(
        productsRef,
        where('isActive', '==', true),
        where('name', '>=', term.trim()),
        where('name', '<=', term.trim() + '\uf8ff'),
        orderBy('name'),
        limit(8)
      );

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Also search in descriptions and categories (client-side)
      const allProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const filtered = allProducts.filter(product => {
        const searchLower = term.toLowerCase();
        return (
          product.name?.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.category?.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower)
        );
      });

      setSuggestions(filtered.slice(0, 8));
      setIsOpen(filtered.length > 0);
    } catch (error) {
      console.error('Error searching products:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelect = (product) => {
    setSearchTerm(product.name);
    setIsOpen(false);
    if (onSelect) {
      onSelect(product);
    } else {
      navigate(`/products/${product.id}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setIsOpen(false);
      navigate(`/products?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const startVoiceSearch = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base"
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showVoiceSearch && (
            <button
              type="button"
              onClick={isListening ? stopVoiceSearch : startVoiceSearch}
              className={`p-2 rounded-lg transition-colors ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-100'
              }`}
              title={isListening ? 'Stop listening' : 'Voice search'}
            >
              {isListening ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          )}
          
          <button
            type="submit"
            className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </form>

      {/* Autocomplete Suggestions */}
      {isOpen && (suggestions.length > 0 || loading) && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : (
            <>
              {suggestions.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {product.image && (
                      <img
                        src={product.image || product.images?.[0] || '/placeholder.png'}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.category} • ₦{product.price?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {suggestions.length > 0 && (
                <button
                  onClick={handleSubmit}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-emerald-600 border-t border-gray-200"
                >
                  View all results for "{searchTerm}"
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;

