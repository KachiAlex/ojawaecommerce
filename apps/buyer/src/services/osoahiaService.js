// Osoahia AI Shopping Assistant Service
import firebaseService from './firebaseService';

class OsoahiaService {
  constructor() {
    this.conversationHistory = [];
    this.userPreferences = {};
    this.currentContext = null;
    this.isTyping = false;
  }

  // Initialize Osoahia with user context
  async initialize(userId, userProfile = null) {
    try {
      this.userId = userId;
      this.userProfile = userProfile;
      
      // Load user preferences and conversation history
      await this.loadUserPreferences();
      await this.loadConversationHistory();
      
      return {
        success: true,
        message: "Osoahia initialized successfully! How can I help you shop today?",
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

  // Process user message and generate response
  async processMessage(message, context = null) {
    try {
      this.currentContext = context;
      this.isTyping = true;
      
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
      
      // Add AI response to history
      this.conversationHistory.push({
        type: 'assistant',
        message: response.message,
        timestamp: new Date(),
        intent,
        actions: response.actions || [],
        suggestions: response.suggestions || []
      });

      // Save conversation
      await this.saveConversationHistory();
      
      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        message: "I apologize, but I'm having trouble understanding. Could you please rephrase your question?",
        type: 'error',
        suggestions: ["Search products", "View cart", "Get help"]
      };
    } finally {
      this.isTyping = false;
    }
  }

  // Analyze user intent from message
  async analyzeIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Product search intent
    if (this.containsKeywords(lowerMessage, ['find', 'search', 'looking for', 'need', 'want', 'buy', 'show me'])) {
      return {
        type: 'product_search',
        confidence: 0.9,
        entities: this.extractProductEntities(message)
      };
    }

    // Cart management intent
    if (this.containsKeywords(lowerMessage, ['cart', 'add to cart', 'remove', 'checkout', 'buy now'])) {
      return {
        type: 'cart_management',
        confidence: 0.8,
        entities: this.extractCartEntities(message)
      };
    }

    // Product information intent
    if (this.containsKeywords(lowerMessage, ['what is', 'tell me about', 'details', 'price', 'available', 'in stock'])) {
      return {
        type: 'product_info',
        confidence: 0.8,
        entities: this.extractProductEntities(message)
      };
    }

    // Recommendations intent
    if (this.containsKeywords(lowerMessage, ['recommend', 'suggest', 'similar', 'popular', 'trending', 'best'])) {
      return {
        type: 'recommendations',
        confidence: 0.9,
        entities: this.extractRecommendationEntities(message)
      };
    }

    // Comparison intent
    if (this.containsKeywords(lowerMessage, ['compare', 'difference', 'better', 'vs', 'versus'])) {
      return {
        type: 'product_comparison',
        confidence: 0.8,
        entities: this.extractComparisonEntities(message)
      };
    }

    // Help intent
    if (this.containsKeywords(lowerMessage, ['help', 'how to', 'guide', 'tutorial', 'explain'])) {
      return {
        type: 'help',
        confidence: 0.9,
        entities: this.extractHelpEntities(message)
      };
    }

    // Greeting intent
    if (this.containsKeywords(lowerMessage, ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
      return {
        type: 'greeting',
        confidence: 0.9
      };
    }

    // Default to general assistance
    return {
      type: 'general_assistance',
      confidence: 0.5,
      entities: []
    };
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
      
      case 'help':
        return await this.handleHelp(intent, originalMessage);
      
      case 'greeting':
        return await this.handleGreeting(intent, originalMessage);
      
      default:
        return await this.handleGeneralAssistance(intent, originalMessage);
    }
  }

  // Handle product search requests
  async handleProductSearch(intent, message) {
    try {
      const searchTerms = intent.entities.filter(e => e.type === 'product').map(e => e.value);
      
      if (searchTerms.length === 0) {
        return {
          message: "I'd be happy to help you find products! What are you looking for? You can search by category, brand, or specific items.",
          type: 'clarification',
          suggestions: [
            "Show me electronics",
            "Find fashion items",
            "Search for home goods",
            "Browse categories"
          ]
        };
      }

      // Search for products
      const products = await this.searchProducts(searchTerms.join(' '));
      
      if (products.length === 0) {
        return {
          message: `I couldn't find any products matching "${searchTerms.join(' ')}". Let me suggest some alternatives or help you refine your search.`,
          type: 'no_results',
          suggestions: [
            "Try different keywords",
            "Browse categories",
            "View popular items",
            "Get recommendations"
          ]
        };
      }

      const productCards = products.slice(0, 3).map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || product.image,
        category: product.category,
        rating: product.rating || 4.0,
        inStock: product.stock > 0
      }));

      return {
        message: `I found ${products.length} products matching "${searchTerms.join(' ')}". Here are the top results:`,
        type: 'product_results',
        products: productCards,
        actions: [
          { type: 'view_all', label: 'View All Results', data: { searchTerm: searchTerms.join(' ') } },
          { type: 'filter', label: 'Filter Results', data: { products } }
        ],
        suggestions: [
          "Show me more results",
          "Filter by price",
          "Sort by rating",
          "Add to cart"
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

  // Handle recommendations requests
  async handleRecommendations(intent, message) {
    try {
      const recommendationType = this.getRecommendationType(message);
      
      let recommendations;
      switch (recommendationType) {
        case 'personalized':
          recommendations = await this.getPersonalizedRecommendations();
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

      if (recommendations.length === 0) {
        return {
          message: "I don't have recommendations available right now, but I can help you find what you're looking for!",
          type: 'no_recommendations',
          suggestions: [
            "Search for products",
            "Browse categories",
            "View popular items",
            "Get help"
          ]
        };
      }

      return {
        message: `Here are my ${recommendationType} recommendations for you:`,
        type: 'recommendations',
        recommendations: recommendations.slice(0, 6),
        actions: [
          { type: 'view_all_recommendations', label: 'View All', data: { type: recommendationType } }
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

  extractProductEntities(message) {
    const entities = [];
    const productKeywords = ['laptop', 'phone', 'shirt', 'dress', 'shoes', 'book', 'watch', 'bag', 'headphones', 'camera'];
    
    productKeywords.forEach(keyword => {
      if (message.toLowerCase().includes(keyword)) {
        entities.push({ type: 'product', value: keyword, confidence: 0.8 });
      }
    });
    
    return entities;
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

  async searchProducts(searchTerm) {
    try {
      return await firebaseService.products.search(searchTerm, { pageSize: 10 });
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getPersonalizedRecommendations() {
    try {
      // Get user's order history and preferences
      const userOrders = await firebaseService.orders.getByUser(this.userId);
      const categories = this.extractUserPreferences(userOrders);
      
      // Get recommendations based on user preferences
      return await firebaseService.products.getByCategory(categories[0] || 'Electronics', { pageSize: 6 });
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
    return [
      "Search for products",
      "Get recommendations",
      "Browse categories",
      "View popular items"
    ];
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
        this.conversationHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  }

  async saveConversationHistory() {
    try {
      // Keep only last 50 messages to prevent storage bloat
      const recentHistory = this.conversationHistory.slice(-50);
      localStorage.setItem(`osoahia_history_${this.userId}`, JSON.stringify(recentHistory));
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
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
