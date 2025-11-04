// Osoahia AI Shopping Assistant Service
import firebaseService from './firebaseService';

class OsoahiaService {
  constructor() {
    this.conversationHistory = [];
    this.userPreferences = {};
    this.currentContext = null;
    this.isTyping = false;
    this.conversationContext = {
      lastIntent: null,
      lastProducts: [],
      lastSearchTerm: null,
      filters: {},
      pendingAction: null
    };
    this.entities = {
      categories: ['electronics', 'fashion', 'home', 'books', 'sports', 'toys', 'beauty', 'health', 'automotive', 'food'],
      brands: [],
      priceRanges: []
    };
    
    // Performance optimizations
    this.responseCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.debounceTimer = null;
    this.pendingQueries = [];
    
    // User behavior tracking
    this.userBehavior = {
      clicks: [],
      searches: [],
      purchases: [],
      preferences: {},
      feedback: []
    };
    
    // Analytics
    this.analytics = {
      queries: 0,
      responses: 0,
      actions: 0,
      errors: 0,
      avgResponseTime: 0,
      responseTimes: []
    };
  }

  // Initialize Osoahia with user context
  async initialize(userId, userProfile = null) {
    try {
      this.userId = userId;
      this.userProfile = userProfile;
      
      // Load user preferences, conversation history, and behavior
      await this.loadUserPreferences();
      await this.loadConversationHistory();
      await this.loadUserBehavior();
      
      // Generate personalized greeting
      const personalizedGreeting = this.generatePersonalizedGreeting();
      
      return {
        success: true,
        message: personalizedGreeting,
        suggestions: this.getInitialSuggestions()
      };
    } catch (error) {
      console.error('Error initializing Osoahia:', error);
      return {
        success: false,
        message: "Sorry, I'm having trouble connecting. Please try again.",
        suggestions: ["Search products", "View recommendations", "Help with checkout"]
      };
    }
  }

  // Generate personalized greeting based on user behavior
  generatePersonalizedGreeting() {
    const timeOfDay = this.getTimeOfDay();
    const personalizedGreeting = this.getPersonalizedGreeting();
    
    // Check if user has recent searches
    const recentSearches = this.userBehavior.searches.filter(
      s => Date.now() - s.timestamp < 24 * 60 * 60 * 1000
    );
    
    if (recentSearches.length > 0) {
      const lastSearch = recentSearches[recentSearches.length - 1];
      return `${personalizedGreeting}! ${timeOfDay} I noticed you were looking for "${lastSearch.query}" recently. Would you like to continue searching or explore something new?`;
    }
    
    // Check if user has preferences
    if (this.userBehavior.preferences.categories && Object.keys(this.userBehavior.preferences.categories).length > 0) {
      const topCategory = Object.keys(this.userBehavior.preferences.categories).sort(
        (a, b) => this.userBehavior.preferences.categories[b] - this.userBehavior.preferences.categories[a]
      )[0];
      return `${personalizedGreeting}! ${timeOfDay} I see you're interested in ${topCategory}. How can I help you find the perfect ${topCategory} today?`;
    }
    
    return `${personalizedGreeting}! ${timeOfDay} I'm Osoahia, your AI shopping assistant. How can I help you find the perfect products today?`;
  }

  // Process user message with optimizations
  async processMessage(message, context = null) {
    const startTime = Date.now();
    try {
      this.currentContext = context;
      this.isTyping = true;
      this.analytics.queries++;
      
      // Check cache first
      const cacheKey = this.getCacheKey(message, context);
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        console.log('🎯 Using cached response');
        this.analytics.responses++;
        return cachedResponse;
      }
      
      // Add user message to history
      this.conversationHistory.push({
        type: 'user',
        message,
        timestamp: new Date(),
        context
      });

      // Analyze intent and generate response
      const intent = await this.analyzeIntent(message);
      const response = await this.generateResponse(intent, message);
      
      // Track user behavior
      this.trackUserBehavior(message, intent, response);
      
      // Add AI response to history
      this.conversationHistory.push({
        type: 'assistant',
        message: response.message,
        timestamp: new Date(),
        intent,
        actions: response.actions || [],
        suggestions: response.suggestions || []
      });

      // Cache response
      this.cacheResponse(cacheKey, response);
      
      // Save conversation (debounced)
      this.debounceSave();
      
      // Track analytics
      const responseTime = Date.now() - startTime;
      this.trackResponseTime(responseTime);
      
      this.analytics.responses++;
      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      this.analytics.errors++;
      
      // Try to recover with context
      const recoveryResponse = await this.tryErrorRecovery(message, error);
      if (recoveryResponse) {
        return recoveryResponse;
      }
      
      return {
        message: "I apologize, but I'm having trouble understanding. Could you please rephrase your question?",
        type: 'error',
        suggestions: this.getProactiveSuggestions()
      };
    } finally {
      this.isTyping = false;
    }
  }

  // Get cache key for message
  getCacheKey(message, context) {
    const normalizedMessage = message.toLowerCase().trim();
    const contextKey = context ? JSON.stringify(context) : '';
    return `${normalizedMessage}_${contextKey}`;
  }

  // Get cached response
  getCachedResponse(cacheKey) {
    const cached = this.responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.response;
    }
    if (cached) {
      this.responseCache.delete(cacheKey);
    }
    return null;
  }

  // Cache response
  cacheResponse(cacheKey, response) {
    // Limit cache size
    if (this.responseCache.size > 100) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }
    
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
  }

  // Debounce save to prevent excessive writes
  debounceSave() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.saveConversationHistory();
      this.saveUserPreferences();
      this.saveUserBehavior();
    }, 2000); // Save after 2 seconds of inactivity
  }

  // Track user behavior
  trackUserBehavior(message, intent, response) {
    // Track search queries
    if (intent.type === 'product_search') {
      this.userBehavior.searches.push({
        query: message,
        timestamp: Date.now(),
        results: response.products?.length || 0
      });
    }
    
    // Track clicked products
    if (response.products && response.products.length > 0) {
      // Will be updated when user clicks on products
      this.userBehavior.preferences.products = response.products.map(p => p.id);
    }
    
    // Learn from user preferences
    if (intent.entities) {
      const categories = intent.entities.filter(e => e.type === 'category').map(e => e.value);
      const prices = intent.entities.filter(e => e.type === 'price_max' || e.type === 'price_range').map(e => e.value || e.max);
      
      if (categories.length > 0) {
        categories.forEach(cat => {
          this.userBehavior.preferences.categories = this.userBehavior.preferences.categories || {};
          this.userBehavior.preferences.categories[cat] = (this.userBehavior.preferences.categories[cat] || 0) + 1;
        });
      }
      
      if (prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        if (!this.userBehavior.preferences.averagePrice) {
          this.userBehavior.preferences.averagePrice = avgPrice;
        } else {
          this.userBehavior.preferences.averagePrice = (this.userBehavior.preferences.averagePrice + avgPrice) / 2;
        }
      }
    }
  }

  // Track response time
  trackResponseTime(responseTime) {
    this.analytics.responseTimes.push(responseTime);
    if (this.analytics.responseTimes.length > 100) {
      this.analytics.responseTimes.shift();
    }
    
    const avg = this.analytics.responseTimes.reduce((a, b) => a + b, 0) / this.analytics.responseTimes.length;
    this.analytics.avgResponseTime = avg;
  }

  // Try error recovery
  async tryErrorRecovery(message, error) {
    // Try to use conversation context
    if (this.conversationContext.lastIntent) {
      const lastIntent = this.conversationContext.lastIntent;
      if (lastIntent.type === 'product_search' && this.conversationContext.lastSearchTerm) {
        return {
          message: "I'm having trouble with that search. Let me try again with your previous search terms.",
          type: 'recovery',
          suggestions: [`Search for ${this.conversationContext.lastSearchTerm}`, "Try different keywords", "Browse categories"]
        };
      }
    }
    
    // Try to understand partial message
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.length < 3) {
      return {
        message: "Could you provide more details? I'm here to help you find products, manage your cart, or answer questions.",
        type: 'clarification',
        suggestions: this.getProactiveSuggestions()
      };
    }
    
    return null;
  }

  // Save user behavior
  async saveUserBehavior() {
    try {
      localStorage.setItem(`osoahia_behavior_${this.userId}`, JSON.stringify(this.userBehavior));
    } catch (error) {
      console.error('Error saving user behavior:', error);
    }
  }

  // Load user behavior
  async loadUserBehavior() {
    try {
      const saved = localStorage.getItem(`osoahia_behavior_${this.userId}`);
      if (saved) {
        this.userBehavior = { ...this.userBehavior, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading user behavior:', error);
    }
  }

  // Track action execution
  trackAction(actionType, actionData) {
    this.analytics.actions++;
    this.userBehavior.clicks.push({
      type: actionType,
      data: actionData,
      timestamp: Date.now()
    });
    
    // Save behavior
    this.saveUserBehavior();
  }

  // Get analytics summary
  getAnalyticsSummary() {
    return {
      totalQueries: this.analytics.queries,
      totalResponses: this.analytics.responses,
      totalActions: this.analytics.actions,
      totalErrors: this.analytics.errors,
      avgResponseTime: this.analytics.avgResponseTime,
      cacheHitRate: this.responseCache.size > 0 ? (this.analytics.responses - this.analytics.queries) / this.analytics.queries : 0,
      userSearches: this.userBehavior.searches.length,
      userPreferences: this.userBehavior.preferences
    };
  }

  // Enhanced intent analysis with confidence scoring and multi-intent support
  async analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();
    const intents = [];
    
    // Check for context continuation (follow-up questions)
    if (this.isFollowUpQuestion(message)) {
      const lastIntent = this.conversationContext.lastIntent;
      if (lastIntent) {
        return {
          ...lastIntent,
          isFollowUp: true,
          originalMessage: message
        };
      }
    }
    
    // Product search intent (enhanced with more patterns)
    const searchKeywords = ['find', 'search', 'looking for', 'need', 'want', 'buy', 'show me', 'looking to buy', 'where can i find', 'where to buy'];
    const searchScore = this.calculateKeywordScore(lowerMessage, searchKeywords);
    if (searchScore > 0.3) {
      intents.push({
        type: 'product_search',
        confidence: Math.min(0.95, 0.6 + searchScore * 0.3),
        entities: this.extractAdvancedEntities(message)
      });
    }

    // Cart management intent (enhanced)
    const cartKeywords = ['cart', 'add to cart', 'remove', 'checkout', 'buy now', 'purchase', 'order', 'check out'];
    const cartScore = this.calculateKeywordScore(lowerMessage, cartKeywords);
    if (cartScore > 0.3) {
      intents.push({
        type: 'cart_management',
        confidence: Math.min(0.95, 0.6 + cartScore * 0.3),
        entities: this.extractAdvancedEntities(message)
      });
    }

    // Product information intent (enhanced)
    const infoKeywords = ['what is', 'tell me about', 'details', 'price', 'available', 'in stock', 'how much', 'cost', 'specifications'];
    const infoScore = this.calculateKeywordScore(lowerMessage, infoKeywords);
    if (infoScore > 0.3) {
      intents.push({
        type: 'product_info',
        confidence: Math.min(0.95, 0.6 + infoScore * 0.3),
        entities: this.extractAdvancedEntities(message)
      });
    }

    // Recommendations intent (enhanced)
    const recKeywords = ['recommend', 'suggest', 'similar', 'popular', 'trending', 'best', 'what should i buy', 'top picks'];
    const recScore = this.calculateKeywordScore(lowerMessage, recKeywords);
    if (recScore > 0.3) {
      intents.push({
        type: 'recommendations',
        confidence: Math.min(0.95, 0.6 + recScore * 0.3),
        entities: this.extractAdvancedEntities(message)
      });
    }

    // Comparison intent (enhanced)
    const compKeywords = ['compare', 'difference', 'better', 'vs', 'versus', 'which is better', 'which one should i choose'];
    const compScore = this.calculateKeywordScore(lowerMessage, compKeywords);
    if (compScore > 0.3) {
      intents.push({
        type: 'product_comparison',
        confidence: Math.min(0.95, 0.6 + compScore * 0.3),
        entities: this.extractAdvancedEntities(message)
      });
    }

    // Price/budget intent (new)
    const priceKeywords = ['under', 'below', 'cheap', 'affordable', 'budget', 'price range', 'maximum price', 'less than'];
    const priceScore = this.calculateKeywordScore(lowerMessage, priceKeywords);
    if (priceScore > 0.3) {
      intents.push({
        type: 'price_filter',
        confidence: Math.min(0.95, 0.6 + priceScore * 0.3),
        entities: this.extractAdvancedEntities(message)
      });
    }

    // Help intent
    const helpKeywords = ['help', 'how to', 'guide', 'tutorial', 'explain', 'how do i', 'what do i need to do'];
    const helpScore = this.calculateKeywordScore(lowerMessage, helpKeywords);
    if (helpScore > 0.3) {
      intents.push({
        type: 'help',
        confidence: Math.min(0.95, 0.6 + helpScore * 0.3),
        entities: this.extractAdvancedEntities(message)
      });
    }

    // Greeting intent
    const greetingKeywords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'];
    const greetingScore = this.calculateKeywordScore(lowerMessage, greetingKeywords);
    if (greetingScore > 0.5) {
      intents.push({
        type: 'greeting',
        confidence: 0.95
      });
    }

    // Sort by confidence and return top intent
    if (intents.length > 0) {
      intents.sort((a, b) => b.confidence - a.confidence);
      const topIntent = intents[0];
      
      // Store for context
      this.conversationContext.lastIntent = topIntent;
      
      return topIntent;
    }

    // Default to general assistance
    return {
      type: 'general_assistance',
      confidence: 0.5,
      entities: this.extractAdvancedEntities(message)
    };
  }

  // Calculate keyword score (for fuzzy matching)
  calculateKeywordScore(text, keywords) {
    let score = 0;
    let matches = 0;
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 1 / keywords.length;
        matches++;
      }
    });
    
    // Boost score if multiple keywords match
    if (matches > 1) {
      score *= 1.2;
    }
    
    return Math.min(1, score);
  }

  // Check if message is a follow-up question
  isFollowUpQuestion(message) {
    const followUpIndicators = ['what about', 'how about', 'and', 'also', 'what else', 'more', 'another', 'the', 'this', 'that', 'these', 'those', 'it'];
    const lowerMessage = message.toLowerCase().trim();
    
    // Check if message starts with follow-up indicators
    for (const indicator of followUpIndicators) {
      if (lowerMessage.startsWith(indicator + ' ') || lowerMessage === indicator) {
        return true;
      }
    }
    
    // Check if message is very short (likely a follow-up)
    if (lowerMessage.split(' ').length <= 3 && this.conversationContext.lastIntent) {
      return true;
    }
    
    return false;
  }

  // Generate response based on intent
  async generateResponse(intent, originalMessage) {
    switch (intent.type) {
      case 'product_search':
        return await this.handleProductSearch(intent, originalMessage);
      
      case 'cart_management':
        return await this.handleCartManagement(intent, originalMessage);
      
      case 'product_info':
        return await this.handleProductInfo(intent, originalMessage);
      
      case 'recommendations':
        return await this.handleRecommendations(intent, originalMessage);
      
      case 'product_comparison':
        return await this.handleProductComparison(intent, originalMessage);
      
      case 'price_filter':
        return await this.handlePriceFilter(intent, originalMessage);
      
      case 'help':
        return await this.handleHelp(intent, originalMessage);
      
      case 'greeting':
        return await this.handleGreeting(intent, originalMessage);
      
      default:
        return await this.handleGeneralAssistance(intent, originalMessage);
    }
  }

  // Handle price filter requests (new)
  async handlePriceFilter(intent, message) {
    try {
      const priceEntities = intent.entities.filter(e => 
        e.type === 'price' || e.type === 'price_min' || e.type === 'price_max' || e.type === 'price_range'
      );
      
      if (priceEntities.length === 0) {
        return {
          message: "I can help you find products within your budget! What price range are you looking for? For example, 'products under ₦50,000' or 'items between ₦10,000 and ₦30,000'.",
          type: 'clarification',
          suggestions: [
            "Show me products under ₦50,000",
            "Find items between ₦10,000 and ₦30,000",
            "Affordable products",
            "Budget-friendly options"
          ]
        };
      }
      
      // Build search options from price entities
      const searchOptions = {
        pageSize: 20,
        minPrice: null,
        maxPrice: null,
        sortBy: 'price_low' // Sort by price ascending for budget searches
      };
      
      priceEntities.forEach(priceEntity => {
        if (priceEntity.type === 'price_min') {
          searchOptions.minPrice = priceEntity.value;
        } else if (priceEntity.type === 'price_max') {
          searchOptions.maxPrice = priceEntity.value;
        } else if (priceEntity.type === 'price_range') {
          searchOptions.minPrice = priceEntity.min;
          searchOptions.maxPrice = priceEntity.max;
        } else if (priceEntity.type === 'price') {
          searchOptions.maxPrice = priceEntity.value;
        }
      });
      
      // Get products within price range
      const allProducts = await firebaseService.products.getAll({ status: 'active' });
      let filteredProducts = allProducts.filter(product => {
        const price = parseFloat(product.price) || 0;
        if (searchOptions.minPrice && price < searchOptions.minPrice) return false;
        if (searchOptions.maxPrice && price > searchOptions.maxPrice) return false;
        return true;
      });
      
      // Sort by price
      filteredProducts.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
      
      if (filteredProducts.length === 0) {
        return {
          message: `I couldn't find any products in your price range. Would you like to adjust your budget or see what's available?`,
          type: 'no_results',
          suggestions: [
            "Increase budget",
            "Show all products",
            "Get recommendations",
            "Browse categories"
          ]
        };
      }
      
      const productCards = filteredProducts.slice(0, 6).map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency || '₦ NGN',
        image: product.images?.[0] || product.image,
        category: product.category,
        rating: product.rating || 4.0,
        inStock: product.stock > 0
      }));
      
      let priceMessage = `I found ${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`;
      if (searchOptions.minPrice && searchOptions.maxPrice) {
        priceMessage += ` between ₦${searchOptions.minPrice.toLocaleString()} and ₦${searchOptions.maxPrice.toLocaleString()}`;
      } else if (searchOptions.maxPrice) {
        priceMessage += ` under ₦${searchOptions.maxPrice.toLocaleString()}`;
      } else if (searchOptions.minPrice) {
        priceMessage += ` above ₦${searchOptions.minPrice.toLocaleString()}`;
      }
      priceMessage += '. Here are the best options sorted by price:';
      
      return {
        message: priceMessage,
        type: 'price_filtered_results',
        products: productCards,
        totalResults: filteredProducts.length,
        priceRange: {
          min: searchOptions.minPrice,
          max: searchOptions.maxPrice
        },
        actions: [
          { type: 'view_all', label: 'View All Results', data: { filters: searchOptions } },
          { type: 'adjust_price', label: 'Adjust Price Range', data: { currentRange: searchOptions } }
        ],
        suggestions: [
          "Show cheapest options",
          "Sort by rating",
          "Filter by category",
          "Get recommendations"
        ]
      };
    } catch (error) {
      console.error('Error handling price filter:', error);
      return {
        message: "I'm having trouble filtering products by price. Please try again or browse our categories.",
        type: 'error',
        suggestions: ["Browse categories", "Search products", "Get help"]
      };
    }
  }

  // Enhanced product search with filters and context awareness
  async handleProductSearch(intent, message) {
    try {
      // Extract search terms from entities
      const productEntities = intent.entities.filter(e => e.type === 'product');
      const categoryEntities = intent.entities.filter(e => e.type === 'category');
      const priceEntities = intent.entities.filter(e => e.type === 'price' || e.type === 'price_min' || e.type === 'price_max' || e.type === 'price_range');
      const filterEntities = intent.entities.filter(e => e.type === 'filter');
      
      // Build search query
      let searchTerm = '';
      if (productEntities.length > 0) {
        searchTerm = productEntities.map(e => e.value).join(' ');
      } else if (intent.isFollowUp && this.conversationContext.lastSearchTerm) {
        // Use context from previous search
        searchTerm = this.conversationContext.lastSearchTerm;
      } else {
        // Extract search terms from message (improved)
        const words = message.toLowerCase().split(/\s+/);
        const stopWords = ['find', 'search', 'looking', 'for', 'show', 'me', 'i', 'want', 'need', 'buy', 'the', 'a', 'an', 'is', 'are', 'was', 'were'];
        const searchWords = words.filter(w => !stopWords.includes(w) && w.length > 2);
        searchTerm = searchWords.join(' ');
      }
      
      // Build search options with filters
      const searchOptions = {
        pageSize: 20,
        category: categoryEntities.length > 0 ? categoryEntities[0].value : null,
        minPrice: null,
        maxPrice: null,
        sortBy: 'relevance'
      };
      
      // Apply price filters
      priceEntities.forEach(priceEntity => {
        if (priceEntity.type === 'price_min') {
          searchOptions.minPrice = priceEntity.value;
        } else if (priceEntity.type === 'price_max') {
          searchOptions.maxPrice = priceEntity.value;
        } else if (priceEntity.type === 'price_range') {
          searchOptions.minPrice = priceEntity.min;
          searchOptions.maxPrice = priceEntity.max;
        } else if (priceEntity.type === 'price') {
          // If exact price, treat as maximum
          searchOptions.maxPrice = priceEntity.value;
        }
      });
      
      // Store search context
      this.conversationContext.lastSearchTerm = searchTerm;
      this.conversationContext.filters = {
        category: searchOptions.category,
        minPrice: searchOptions.minPrice,
        maxPrice: searchOptions.maxPrice
      };
      
      if (!searchTerm || searchTerm.trim() === '') {
        return {
          message: "I'd be happy to help you find products! What are you looking for? You can search by category, brand, or specific items. I can also help you filter by price!",
          type: 'clarification',
          suggestions: [
            "Show me electronics",
            "Find fashion items under ₦50,000",
            "Search for home goods",
            "Browse categories"
          ]
        };
      }

      // Search for products with filters
      const products = await this.searchProducts(searchTerm, searchOptions);
      
      // Apply additional filters client-side
      let filteredProducts = products;
      filterEntities.forEach(filter => {
        if (filter.filterType === 'color') {
          filteredProducts = filteredProducts.filter(p => 
            p.name?.toLowerCase().includes(filter.value) ||
            p.description?.toLowerCase().includes(filter.value) ||
            p.category?.toLowerCase().includes(filter.value)
          );
        }
      });
      
      if (filteredProducts.length === 0) {
        // Try without filters if no results
        if (products.length > 0) {
          filteredProducts = products;
        } else {
          return {
            message: `I couldn't find any products matching "${searchTerm}". Let me suggest some alternatives or help you refine your search.`,
            type: 'no_results',
            suggestions: [
              "Try different keywords",
              "Browse categories",
              "View popular items",
              "Get recommendations"
            ]
          };
        }
      }

      // Store products in context
      this.conversationContext.lastProducts = filteredProducts.slice(0, 10);

      const productCards = filteredProducts.slice(0, 6).map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency || '₦ NGN',
        image: product.images?.[0] || product.image,
        category: product.category,
        rating: product.rating || 4.0,
        inStock: product.stock > 0,
        vendor: product.vendorName || product.vendorEmail
      }));

      // Build response message with context
      let responseMessage = `I found ${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} matching "${searchTerm}"`;
      
      if (searchOptions.minPrice || searchOptions.maxPrice) {
        responseMessage += ' with your price filter';
        if (searchOptions.minPrice && searchOptions.maxPrice) {
          responseMessage += ` (₦${searchOptions.minPrice.toLocaleString()} - ₦${searchOptions.maxPrice.toLocaleString()})`;
        } else if (searchOptions.maxPrice) {
          responseMessage += ` (under ₦${searchOptions.maxPrice.toLocaleString()})`;
        } else if (searchOptions.minPrice) {
          responseMessage += ` (above ₦${searchOptions.minPrice.toLocaleString()})`;
        }
      }
      
      responseMessage += '. Here are the top results:';

      return {
        message: responseMessage,
        type: 'product_results',
        products: productCards,
        searchTerm: searchTerm,
        totalResults: filteredProducts.length,
        filters: searchOptions,
        actions: [
          { type: 'view_all', label: 'View All Results', data: { searchTerm, filters: searchOptions } },
          { type: 'filter', label: 'Filter Results', data: { products: filteredProducts, filters: searchOptions } }
        ],
        suggestions: [
          "Show me more results",
          "Filter by price",
          "Sort by rating",
          "Show cheapest options"
        ]
      };
    } catch (error) {
      console.error('Error handling product search:', error);
      return {
        message: "I'm having trouble searching for products right now. Please try again or browse our categories.",
        type: 'error',
        suggestions: ["Browse categories", "View popular items", "Get help"]
      };
    }
  }

  // Handle cart management requests
  async handleCartManagement(intent, message) {
    try {
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('add to cart') || lowerMessage.includes('add')) {
        return {
          message: "I'd be happy to help you add items to your cart! Please select a product first, or tell me which product you'd like to add.",
          type: 'clarification',
          suggestions: [
            "Show me products",
            "View my cart",
            "Search for items",
            "Get recommendations"
          ]
        };
      }

      if (lowerMessage.includes('remove') || lowerMessage.includes('delete')) {
        return {
          message: "I can help you remove items from your cart. Would you like to view your current cart items?",
          type: 'clarification',
          actions: [
            { type: 'view_cart', label: 'View Cart', data: {} }
          ],
          suggestions: [
            "View my cart",
            "Clear cart",
            "Update quantities",
            "Checkout"
          ]
        };
      }

      if (lowerMessage.includes('checkout') || lowerMessage.includes('buy now')) {
        return {
          message: "Great! I can help you with checkout. Let me check your cart and guide you through the process.",
          type: 'checkout_assistance',
          actions: [
            { type: 'go_to_checkout', label: 'Go to Checkout', data: {} }
          ],
          suggestions: [
            "Review cart items",
            "Add delivery address",
            "Choose payment method",
            "Apply discount code"
          ]
        };
      }

      return {
        message: "I can help you manage your cart! What would you like to do?",
        type: 'cart_help',
        actions: [
          { type: 'view_cart', label: 'View Cart', data: {} }
        ],
        suggestions: [
          "View my cart",
          "Add items",
          "Remove items",
          "Checkout"
        ]
      };
    } catch (error) {
      console.error('Error handling cart management:', error);
      return {
        message: "I'm having trouble with cart operations. Please try again or visit your cart directly.",
        type: 'error',
        suggestions: ["View cart", "Get help", "Contact support"]
      };
    }
  }

  // Handle product information requests
  async handleProductInfo(intent, message) {
    try {
      const productTerms = intent.entities.filter(e => e.type === 'product').map(e => e.value);
      
      if (productTerms.length === 0) {
        return {
          message: "I'd be happy to provide product information! Which product would you like to know more about?",
          type: 'clarification',
          suggestions: [
            "Show me products",
            "Search for items",
            "Browse categories",
            "Get recommendations"
          ]
        };
      }

      // Find the product
      const products = await this.searchProducts(productTerms.join(' '));
      
      if (products.length === 0) {
        return {
          message: `I couldn't find information about "${productTerms.join(' ')}". Could you try a different product name or search term?`,
          type: 'no_results',
          suggestions: [
            "Try different keywords",
            "Browse categories",
            "View popular items",
            "Get help"
          ]
        };
      }

      const product = products[0];
      
      return {
        message: `Here's information about ${product.name}:`,
        type: 'product_info',
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          currency: product.currency,
          category: product.category,
          condition: product.condition,
          stock: product.stock,
          images: product.images,
          vendor: product.vendorName,
          rating: product.rating || 4.0,
          features: this.extractProductFeatures(product)
        },
        actions: [
          { type: 'view_product', label: 'View Full Details', data: { productId: product.id } },
          { type: 'add_to_cart', label: 'Add to Cart', data: { productId: product.id } }
        ],
        suggestions: [
          "Add to cart",
          "Compare with similar",
          "View vendor info",
          "Get recommendations"
        ]
      };
    } catch (error) {
      console.error('Error handling product info:', error);
      return {
        message: "I'm having trouble getting product information. Please try again or browse the product directly.",
        type: 'error',
        suggestions: ["Browse products", "Search again", "Get help"]
      };
    }
  }

  // Enhanced recommendations with budget awareness
  async handleRecommendations(intent, message) {
    try {
      const recommendationType = this.getRecommendationType(message);
      
      // Extract budget from entities if present
      const priceEntities = intent.entities.filter(e => 
        e.type === 'price' || e.type === 'price_min' || e.type === 'price_max' || e.type === 'price_range'
      );
      let budget = null;
      if (priceEntities.length > 0) {
        const priceEntity = priceEntities[0];
        if (priceEntity.type === 'price_max') {
          budget = priceEntity.value;
        } else if (priceEntity.type === 'price_range') {
          budget = priceEntity.max;
        } else if (priceEntity.type === 'price') {
          budget = priceEntity.value;
        }
      }
      
      // Check if user has price preferences in context
      if (!budget && this.conversationContext.filters?.maxPrice) {
        budget = this.conversationContext.filters.maxPrice;
      }
      
      let recommendations;
      switch (recommendationType) {
        case 'personalized':
          recommendations = await this.getPersonalizedRecommendations(budget);
          break;
        case 'popular':
          recommendations = await this.getPopularRecommendations();
          break;
        case 'trending':
          recommendations = await this.getTrendingRecommendations();
          break;
        case 'similar':
          recommendations = await this.getSimilarRecommendations(intent.entities);
          break;
        default:
          recommendations = await this.getGeneralRecommendations();
      }
      
      // Apply budget filter if specified
      if (budget && recommendations.length > 0) {
        recommendations = recommendations.filter(p => {
          const price = parseFloat(p.price) || 0;
          return price <= budget;
        });
      }

      if (recommendations.length === 0) {
        let noRecMessage = "I don't have recommendations available right now";
        if (budget) {
          noRecMessage += ` within your budget of ₦${budget.toLocaleString()}`;
        }
        noRecMessage += ", but I can help you find what you're looking for!";
        
        return {
          message: noRecMessage,
          type: 'no_recommendations',
          suggestions: [
            "Search for products",
            "Browse categories",
            "View popular items",
            budget ? "Increase budget" : "Get help"
          ]
        };
      }

      const recommendationCards = recommendations.slice(0, 6).map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency || '₦ NGN',
        image: product.images?.[0] || product.image,
        category: product.category,
        rating: product.rating || 4.0,
        inStock: product.stock > 0,
        vendor: product.vendorName || product.vendorEmail
      }));

      let responseMessage = `Here are my ${recommendationType} recommendations for you`;
      if (budget) {
        responseMessage += ` within your budget of ₦${budget.toLocaleString()}`;
      }
      responseMessage += ':';

      return {
        message: responseMessage,
        type: 'recommendations',
        recommendations: recommendationCards,
        budget: budget,
        actions: [
          { type: 'view_all_recommendations', label: 'View All', data: { type: recommendationType, budget } }
        ],
        suggestions: [
          "Show more",
          "Filter by price",
          "Sort by rating",
          "Get different recommendations"
        ]
      };
    } catch (error) {
      console.error('Error handling recommendations:', error);
      return {
        message: "I'm having trouble getting recommendations right now. Please try browsing our categories or search for specific items.",
        type: 'error',
        suggestions: ["Browse categories", "Search products", "View popular items"]
      };
    }
  }

  // Handle product comparison requests
  async handleProductComparison(intent, message) {
    try {
      const productTerms = intent.entities.filter(e => e.type === 'product').map(e => e.value);
      
      if (productTerms.length < 2) {
        return {
          message: "I can help you compare products! Please mention at least two products you'd like to compare, or let me suggest some popular comparisons.",
          type: 'clarification',
          suggestions: [
            "Compare smartphones",
            "Compare laptops",
            "Compare fashion items",
            "Show me products to compare"
          ]
        };
      }

      // Find products to compare
      const products = await Promise.all(
        productTerms.map(term => this.searchProducts(term))
      );

      const validProducts = products.flat().filter(product => 
        productTerms.some(term => 
          product.name.toLowerCase().includes(term.toLowerCase())
        )
      );

      if (validProducts.length < 2) {
        return {
          message: "I couldn't find enough products to compare. Let me help you find similar products or try different search terms.",
          type: 'insufficient_products',
          suggestions: [
            "Search for products",
            "Browse categories",
            "Get recommendations",
            "Try different keywords"
          ]
        };
      }

      return {
        message: `Here's a comparison of the products you mentioned:`,
        type: 'product_comparison',
        comparison: {
          products: validProducts.slice(0, 3),
          comparisonFields: ['price', 'category', 'condition', 'rating', 'vendor']
        },
        actions: [
          { type: 'detailed_comparison', label: 'Detailed Comparison', data: { products: validProducts } },
          { type: 'add_to_cart', label: 'Add to Cart', data: { products: validProducts } }
        ],
        suggestions: [
          "Detailed comparison",
          "Add to cart",
          "Find similar products",
          "Get recommendations"
        ]
      };
    } catch (error) {
      console.error('Error handling product comparison:', error);
      return {
        message: "I'm having trouble comparing products right now. Please try again or browse products individually.",
        type: 'error',
        suggestions: ["Browse products", "Search again", "Get help"]
      };
    }
  }

  // Handle help requests
  async handleHelp(intent, message) {
    const helpTopics = this.getHelpTopics(message);
    
    if (helpTopics.length === 0) {
      return {
        message: "I'm here to help! I can assist you with shopping, product searches, cart management, and more. What would you like help with?",
        type: 'general_help',
        helpTopics: [
          {
            title: "Product Search",
            description: "Find products by name, category, or description",
            examples: ["Find laptops", "Show me fashion items", "Search for electronics"]
          },
          {
            title: "Cart Management",
            description: "Add, remove, or manage items in your cart",
            examples: ["Add to cart", "Remove item", "View cart"]
          },
          {
            title: "Product Information",
            description: "Get details about specific products",
            examples: ["Tell me about this product", "What's the price?", "Is it in stock?"]
          },
          {
            title: "Recommendations",
            description: "Get personalized product recommendations",
            examples: ["Recommend products", "Show me popular items", "What's trending?"]
          }
        ],
        suggestions: [
          "How to search products",
          "How to add to cart",
          "How to checkout",
          "Get recommendations"
        ]
      };
    }

    return {
      message: `Here's help with ${helpTopics.join(', ')}:`,
      type: 'specific_help',
      helpContent: this.getHelpContent(helpTopics),
      suggestions: [
        "More help topics",
        "Contact support",
        "Browse products",
        "Get started"
      ]
    };
  }

  // Handle greeting requests
  async handleGreeting(intent, message) {
    const timeOfDay = this.getTimeOfDay();
    const personalizedGreeting = this.getPersonalizedGreeting();
    
    return {
      message: `${personalizedGreeting}! I'm Osoahia, your AI shopping assistant. ${timeOfDay} How can I help you find the perfect products today?`,
      type: 'greeting',
      suggestions: [
        "Search for products",
        "Get recommendations",
        "View popular items",
        "Browse categories"
      ]
    };
  }

  // Handle general assistance requests
  async handleGeneralAssistance(intent, message) {
    return {
      message: "I'm here to help you with your shopping experience! I can help you find products, manage your cart, get recommendations, and answer questions. What would you like to do?",
      type: 'general_assistance',
      suggestions: [
        "Search products",
        "View recommendations",
        "Help with cart",
        "Browse categories"
      ]
    };
  }

  // Helper methods
  containsKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  // Advanced entity extraction with prices, quantities, categories, brands, and filters
  extractAdvancedEntities(message) {
    const entities = [];
    const lowerMessage = message.toLowerCase();
    
    // Extract prices (currency amounts)
    const pricePatterns = [
      /(?:₦|n|ngn|naira)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:₦|n|ngn|naira)/gi,
      /(?:under|below|less than|maximum|max|up to)\s*(?:₦|n|ngn|naira)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      /(?:above|over|more than|minimum|min|at least)\s*(?:₦|n|ngn|naira)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      /(?:between|from)\s*(?:₦|n|ngn|naira)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:and|to|-)\s*(?:₦|n|ngn|naira)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi
    ];
    
    pricePatterns.forEach((pattern, index) => {
      const matches = [...message.matchAll(pattern)];
      matches.forEach(match => {
        if (index === 4 && match[1] && match[2]) {
          // Price range
          entities.push({
            type: 'price_range',
            min: parseFloat(match[1].replace(/,/g, '')),
            max: parseFloat(match[2].replace(/,/g, '')),
            confidence: 0.9
          });
        } else if (match[1]) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (index === 2) {
            // Maximum price
            entities.push({
              type: 'price_max',
              value: amount,
              confidence: 0.9
            });
          } else if (index === 3) {
            // Minimum price
            entities.push({
              type: 'price_min',
              value: amount,
              confidence: 0.9
            });
          } else {
            // Exact price
            entities.push({
              type: 'price',
              value: amount,
              confidence: 0.85
            });
          }
        }
      });
    });
    
    // Extract quantities
    const quantityPatterns = [
      /(\d+)\s*(?:x|×|pcs|pieces|units|items)/gi,
      /(?:quantity|qty|amount|how many)\s*(\d+)/gi
    ];
    
    quantityPatterns.forEach(pattern => {
      const matches = [...message.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1]) {
          entities.push({
            type: 'quantity',
            value: parseInt(match[1]),
            confidence: 0.8
          });
        }
      });
    });
    
    // Extract categories
    const categoryKeywords = {
      'electronics': ['electronics', 'electronic', 'laptop', 'phone', 'smartphone', 'tablet', 'computer', 'tv', 'television'],
      'fashion': ['fashion', 'clothing', 'clothes', 'shirt', 'dress', 'shoes', 'bag', 'accessories', 'jewelry'],
      'home': ['home', 'furniture', 'kitchen', 'appliance', 'decor', 'decoration'],
      'books': ['book', 'books', 'novel', 'literature', 'reading'],
      'sports': ['sports', 'sport', 'fitness', 'gym', 'exercise', 'outdoor'],
      'beauty': ['beauty', 'cosmetics', 'makeup', 'skincare', 'perfume'],
      'health': ['health', 'medicine', 'medical', 'supplements', 'vitamins'],
      'toys': ['toy', 'toys', 'games', 'game', 'puzzle'],
      'automotive': ['car', 'automotive', 'vehicle', 'auto', 'parts'],
      'food': ['food', 'groceries', 'snacks', 'beverages', 'drinks']
    };
    
    Object.keys(categoryKeywords).forEach(category => {
      categoryKeywords[category].forEach(keyword => {
        if (lowerMessage.includes(keyword)) {
          entities.push({
            type: 'category',
            value: category,
            confidence: 0.8
          });
        }
      });
    });
    
    // Extract product names (improved - extract from message)
    const productKeywords = ['laptop', 'phone', 'smartphone', 'tablet', 'shirt', 'dress', 'shoes', 'book', 'watch', 'bag', 'headphones', 'camera', 'tv', 'television', 'fridge', 'refrigerator', 'washing machine', 'microwave'];
    
    productKeywords.forEach(keyword => {
      if (lowerMessage.includes(keyword)) {
        entities.push({
          type: 'product',
          value: keyword,
          confidence: 0.8
        });
      }
    });
    
    // Extract product names from quoted text or specific phrases
    const quotedMatch = message.match(/"([^"]+)"/);
    if (quotedMatch) {
      entities.push({
        type: 'product',
        value: quotedMatch[1],
        confidence: 0.95
      });
    }
    
    // Extract filters (color, size, brand, etc.)
    const colorKeywords = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange', 'brown', 'gray', 'grey', 'silver', 'gold'];
    colorKeywords.forEach(color => {
      if (lowerMessage.includes(color)) {
        entities.push({
          type: 'filter',
          filterType: 'color',
          value: color,
          confidence: 0.7
        });
      }
    });
    
    const sizeKeywords = ['small', 'medium', 'large', 'xl', 'xxl', 'xs', 'size'];
    sizeKeywords.forEach(size => {
      if (lowerMessage.includes(size)) {
        entities.push({
          type: 'filter',
          filterType: 'size',
          value: size,
          confidence: 0.7
        });
      }
    });
    
    // Extract brand names (common patterns)
    const brandPattern = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)*)\b/g;
    const brandMatches = [...message.matchAll(brandPattern)];
    brandMatches.forEach(match => {
      const potentialBrand = match[1];
      // Simple heuristic: if it's capitalized and not a common word, it might be a brand
      if (potentialBrand.length > 2 && !['The', 'This', 'That', 'What', 'Where', 'When', 'How'].includes(potentialBrand)) {
        entities.push({
          type: 'brand',
          value: potentialBrand,
          confidence: 0.6
        });
      }
    });
    
    return entities;
  }

  // Legacy method for backward compatibility
  extractProductEntities(message) {
    return this.extractAdvancedEntities(message).filter(e => e.type === 'product');
  }

  extractCartEntities(message) {
    const entities = [];
    if (message.toLowerCase().includes('cart')) {
      entities.push({ type: 'cart_action', value: 'cart', confidence: 0.9 });
    }
    return entities;
  }

  extractRecommendationEntities(message) {
    const entities = [];
    if (message.toLowerCase().includes('popular')) {
      entities.push({ type: 'recommendation_type', value: 'popular', confidence: 0.9 });
    }
    if (message.toLowerCase().includes('trending')) {
      entities.push({ type: 'recommendation_type', value: 'trending', confidence: 0.9 });
    }
    return entities;
  }

  extractComparisonEntities(message) {
    return this.extractProductEntities(message);
  }

  extractHelpEntities(message) {
    const entities = [];
    const helpKeywords = ['search', 'cart', 'checkout', 'payment', 'delivery'];
    
    helpKeywords.forEach(keyword => {
      if (message.toLowerCase().includes(keyword)) {
        entities.push({ type: 'help_topic', value: keyword, confidence: 0.8 });
      }
    });
    
    return entities;
  }

  async searchProducts(searchTerm, options = {}) {
    try {
      // Enhanced search with filters
      const searchOptions = {
        pageSize: options.pageSize || 20,
        category: options.category || null,
        minPrice: options.minPrice || null,
        maxPrice: options.maxPrice || null,
        sortBy: options.sortBy || 'relevance'
      };
      
      // Use Firebase service search
      let products = await firebaseService.products.search(searchTerm, searchOptions);
      
      // Apply price filters client-side if not supported by backend
      if (searchOptions.minPrice || searchOptions.maxPrice) {
        products = products.filter(product => {
          const price = parseFloat(product.price) || 0;
          if (searchOptions.minPrice && price < searchOptions.minPrice) return false;
          if (searchOptions.maxPrice && price > searchOptions.maxPrice) return false;
          return true;
        });
      }
      
      // Sort products
      if (searchOptions.sortBy === 'price_low') {
        products.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
      } else if (searchOptions.sortBy === 'price_high') {
        products.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
      } else if (searchOptions.sortBy === 'rating') {
        products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }
      
      return products;
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getPersonalizedRecommendations(budget = null) {
    try {
      // Get user's order history and preferences
      const userOrders = await firebaseService.orders.getByUser(this.userId);
      const categories = this.extractUserPreferences(userOrders);
      
      // Use learned preferences from behavior tracking
      const learnedCategories = this.userBehavior.preferences.categories 
        ? Object.keys(this.userBehavior.preferences.categories).sort(
            (a, b) => this.userBehavior.preferences.categories[b] - this.userBehavior.preferences.categories[a]
          )
        : [];
      
      // Combine order history categories with learned preferences
      const allCategories = [...new Set([...categories, ...learnedCategories])];
      
      // Get average spending from order history or learned preferences
      let avgPrice = null;
      if (userOrders && userOrders.length > 0) {
        const prices = [];
        userOrders.forEach(order => {
          order.items?.forEach(item => {
            if (item.price) prices.push(parseFloat(item.price));
          });
        });
        if (prices.length > 0) {
          avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        }
      }
      
      // Use budget if provided, otherwise use average spending or learned preferences
      const priceFilter = budget || avgPrice || this.userBehavior.preferences.averagePrice;
      
      // Get recommendations based on user preferences
      let products = [];
      if (allCategories.length > 0) {
        // Try to get products from preferred categories (prioritize learned preferences)
        const categoriesToUse = learnedCategories.length > 0 ? learnedCategories : allCategories;
        for (const category of categoriesToUse.slice(0, 3)) {
          const categoryProducts = await firebaseService.products.getByCategory(category, { pageSize: 10 });
          products.push(...categoryProducts);
        }
      } else {
        // Fallback to general products
        products = await firebaseService.products.getAll({ status: 'active', pageSize: 30 });
      }
      
      // Filter by budget if available
      if (priceFilter) {
        products = products.filter(p => {
          const price = parseFloat(p.price) || 0;
          // Include products within 50% of budget (above or below)
          return price <= priceFilter * 1.5 && price >= priceFilter * 0.5;
        });
      }
      
      // Exclude products user has already viewed (if tracking)
      if (this.userBehavior.preferences.products) {
        products = products.filter(p => !this.userBehavior.preferences.products.includes(p.id));
      }
      
      // Sort by relevance (learned preferences first, then order history, then by rating)
      products.sort((a, b) => {
        const aLearnedIndex = learnedCategories.indexOf(a.category);
        const bLearnedIndex = learnedCategories.indexOf(b.category);
        const aOrderIndex = categories.indexOf(a.category);
        const bOrderIndex = categories.indexOf(b.category);
        
        // Prioritize learned preferences
        if (aLearnedIndex !== -1 && bLearnedIndex !== -1) {
          return aLearnedIndex - bLearnedIndex;
        }
        if (aLearnedIndex !== -1) return -1;
        if (bLearnedIndex !== -1) return 1;
        
        // Then order history
        if (aOrderIndex !== -1 && bOrderIndex !== -1) {
          return aOrderIndex - bOrderIndex;
        }
        if (aOrderIndex !== -1) return -1;
        if (bOrderIndex !== -1) return 1;
        
        // Finally by rating
        return (b.rating || 0) - (a.rating || 0);
      });
      
      return products.slice(0, 6);
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  async getPopularRecommendations() {
    try {
      return await firebaseService.products.getPopular({ pageSize: 6 });
    } catch (error) {
      console.error('Error getting popular recommendations:', error);
      return [];
    }
  }

  async getTrendingRecommendations() {
    try {
      return await firebaseService.products.getTrending({ pageSize: 6 });
    } catch (error) {
      console.error('Error getting trending recommendations:', error);
      return [];
    }
  }

  async getSimilarRecommendations(entities) {
    try {
      const productTerms = entities.filter(e => e.type === 'product').map(e => e.value);
      if (productTerms.length === 0) return [];
      
      const products = await this.searchProducts(productTerms.join(' '));
      if (products.length === 0) return [];
      
      return await firebaseService.products.getSimilar(products[0].id, { pageSize: 6 });
    } catch (error) {
      console.error('Error getting similar recommendations:', error);
      return [];
    }
  }

  async getGeneralRecommendations() {
    try {
      return await firebaseService.products.getFeatured({ pageSize: 6 });
    } catch (error) {
      console.error('Error getting general recommendations:', error);
      return [];
    }
  }

  getRecommendationType(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('personalized') || lowerMessage.includes('for me')) {
      return 'personalized';
    }
    if (lowerMessage.includes('popular') || lowerMessage.includes('best selling')) {
      return 'popular';
    }
    if (lowerMessage.includes('trending') || lowerMessage.includes('hot')) {
      return 'trending';
    }
    if (lowerMessage.includes('similar') || lowerMessage.includes('like')) {
      return 'similar';
    }
    
    return 'general';
  }

  getHelpTopics(message) {
    const topics = [];
    const helpKeywords = {
      'search': 'Product Search',
      'cart': 'Cart Management',
      'checkout': 'Checkout Process',
      'payment': 'Payment Methods',
      'delivery': 'Delivery Options'
    };
    
    Object.keys(helpKeywords).forEach(keyword => {
      if (message.toLowerCase().includes(keyword)) {
        topics.push(helpKeywords[keyword]);
      }
    });
    
    return topics;
  }

  getHelpContent(topics) {
    const helpContent = {
      'Product Search': {
        title: 'How to Search for Products',
        steps: [
          'Type what you\'re looking for (e.g., "laptop", "blue shirt")',
          'Use specific keywords for better results',
          'Browse categories for organized shopping',
          'Use filters to narrow down results'
        ]
      },
      'Cart Management': {
        title: 'Managing Your Cart',
        steps: [
          'Add items by clicking "Add to Cart"',
          'View cart to see all items',
          'Update quantities or remove items',
          'Proceed to checkout when ready'
        ]
      },
      'Checkout Process': {
        title: 'How to Checkout',
        steps: [
          'Review items in your cart',
          'Add delivery address',
          'Choose payment method',
          'Confirm your order'
        ]
      }
    };
    
    return topics.map(topic => helpContent[topic]).filter(Boolean);
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  getPersonalizedGreeting() {
    if (this.userProfile?.displayName) {
      return `Hello ${this.userProfile.displayName.split(' ')[0]}`;
    }
    return 'Hello';
  }

  extractUserPreferences(orders) {
    const categories = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
      });
    });
    
    return Object.keys(categories).sort((a, b) => categories[b] - categories[a]);
  }

  extractProductFeatures(product) {
    const features = [];
    
    if (product.condition) features.push(`Condition: ${product.condition}`);
    if (product.stock > 0) features.push('In Stock');
    if (product.rating) features.push(`Rating: ${product.rating}/5`);
    if (product.vendorName) features.push(`Sold by: ${product.vendorName}`);
    
    return features;
  }

  getInitialSuggestions() {
    // Personalized suggestions based on user preferences
    const suggestions = [
      "Search for products",
      "Get recommendations",
      "Browse categories",
      "View popular items"
    ];
    
    // Add budget-aware suggestions if user has purchase history
    if (this.userPreferences?.averagePrice) {
      const avgPrice = this.userPreferences.averagePrice;
      suggestions.push(`Show me products under ₦${Math.round(avgPrice * 1.2).toLocaleString()}`);
    }
    
    return suggestions;
  }

  // Get proactive suggestions based on context
  getProactiveSuggestions() {
    const suggestions = [];
    
    // Based on recent search
    if (this.conversationContext.lastSearchTerm) {
      suggestions.push(`Show more ${this.conversationContext.lastSearchTerm}`);
      suggestions.push(`Compare ${this.conversationContext.lastSearchTerm} options`);
    }
    
    // Based on price filters
    if (this.conversationContext.filters?.maxPrice) {
      suggestions.push(`Show cheaper options`);
      suggestions.push(`Show similar products`);
    }
    
    // Based on viewed products
    if (this.conversationContext.lastProducts.length > 0) {
      suggestions.push(`Show similar to ${this.conversationContext.lastProducts[0].name}`);
      suggestions.push(`Compare these products`);
    }
    
    // Default suggestions if no context
    if (suggestions.length === 0) {
      suggestions.push("Search for products");
      suggestions.push("Get recommendations");
      suggestions.push("Browse categories");
      suggestions.push("View popular items");
    }
    
    return suggestions.slice(0, 4);
  }

  async loadUserPreferences() {
    try {
      // Load user preferences from localStorage or database
      const saved = localStorage.getItem(`osoahia_preferences_${this.userId}`);
      if (saved) {
        this.userPreferences = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  async saveUserPreferences() {
    try {
      localStorage.setItem(`osoahia_preferences_${this.userId}`, JSON.stringify(this.userPreferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  async loadConversationHistory() {
    try {
      const saved = localStorage.getItem(`osoahia_history_${this.userId}`);
      if (saved) {
        const history = JSON.parse(saved);
        // If history is too long, summarize it
        if (history.length > 100) {
          this.conversationHistory = this.summarizeConversationHistory(history);
        } else {
          this.conversationHistory = history;
        }
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  }

  async saveConversationHistory() {
    try {
      // Summarize if history is too long
      let historyToSave = this.conversationHistory;
      if (historyToSave.length > 100) {
        historyToSave = this.summarizeConversationHistory(historyToSave);
      }
      
      // Keep only last 50 messages to prevent storage bloat
      const recentHistory = historyToSave.slice(-50);
      localStorage.setItem(`osoahia_history_${this.userId}`, JSON.stringify(recentHistory));
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  }

  // Summarize conversation history to reduce storage
  summarizeConversationHistory(history) {
    if (history.length <= 50) return history;
    
    // Keep first few messages (initial context)
    const initialMessages = history.slice(0, 5);
    
    // Keep last 20 messages (recent context)
    const recentMessages = history.slice(-20);
    
    // Summarize middle section
    const middleMessages = history.slice(5, -20);
    const summary = {
      type: 'summary',
      message: `[Previous conversation summary: ${middleMessages.length} messages about ${this.extractSummaryTopics(middleMessages).join(', ')}]`,
      timestamp: middleMessages[0]?.timestamp || new Date(),
      count: middleMessages.length
    };
    
    return [...initialMessages, summary, ...recentMessages];
  }

  // Extract summary topics from conversation
  extractSummaryTopics(messages) {
    const topics = new Set();
    const intents = new Set();
    
    messages.forEach(msg => {
      if (msg.intent) {
        intents.add(msg.intent.type);
      }
      if (msg.entities) {
        msg.entities.forEach(e => {
          if (e.type === 'category') topics.add(e.value);
          if (e.type === 'product') topics.add(e.value);
        });
      }
    });
    
    return Array.from(topics).slice(0, 5);
  }

  // Clear conversation history
  clearHistory() {
    this.conversationHistory = [];
    localStorage.removeItem(`osoahia_history_${this.userId}`);
  }

  // Get conversation history
  getHistory() {
    return this.conversationHistory;
  }

  // Check if Osoahia is typing
  isTypingResponse() {
    return this.isTyping;
  }
}

// Create singleton instance
const osoahiaService = new OsoahiaService();
export default osoahiaService;
