import { errorLogger } from '../utils/errorLogger'

// Search algorithms and utilities
export const SEARCH_ALGORITHMS = {
  FUZZY: 'fuzzy',
  SEMANTIC: 'semantic',
  BOOLEAN: 'boolean',
  FUZZY_SEMANTIC: 'fuzzy_semantic'
}

export const SEARCH_FILTERS = {
  PRICE_RANGE: 'price_range',
  CATEGORY: 'category',
  BRAND: 'brand',
  RATING: 'rating',
  AVAILABILITY: 'availability',
  LOCATION: 'location',
  SHIPPING: 'shipping',
  VENDOR_RATING: 'vendor_rating'
}

export const SORT_OPTIONS = {
  RELEVANCE: 'relevance',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  RATING: 'rating',
  NEWEST: 'newest',
  POPULARITY: 'popularity',
  DISTANCE: 'distance'
}

class AdvancedSearchService {
  constructor() {
    this.searchHistory = []
    this.searchSuggestions = []
    this.searchAnalytics = new Map()
    this.userPreferences = new Map()
    this.searchCache = new Map()
  }

  // Fuzzy search algorithm
  fuzzySearch(query, products, threshold = 0.6) {
    if (!query || !products || products.length === 0) return []

    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/)

    return products
      .map(product => {
        const productText = [
          product.name,
          product.description,
          product.category,
          product.tags?.join(' ') || '',
          product.brand || ''
        ].join(' ').toLowerCase()

        // Calculate similarity score
        const score = this.calculateFuzzyScore(queryWords, productText)
        
        return { product, score }
      })
      .filter(result => result.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .map(result => result.product)
  }

  // Calculate fuzzy similarity score
  calculateFuzzyScore(queryWords, productText) {
    let totalScore = 0
    let matchCount = 0

    for (const word of queryWords) {
      if (productText.includes(word)) {
        totalScore += 1.0
        matchCount++
      } else {
        // Check for partial matches
        const partialScore = this.calculatePartialMatch(word, productText)
        if (partialScore > 0.3) {
          totalScore += partialScore
          matchCount++
        }
      }
    }

    return matchCount > 0 ? totalScore / queryWords.length : 0
  }

  // Calculate partial match score using Levenshtein distance
  calculatePartialMatch(queryWord, productText) {
    const words = productText.split(/\s+/)
    let maxScore = 0

    for (const word of words) {
      const distance = this.levenshteinDistance(queryWord, word)
      const maxLength = Math.max(queryWord.length, word.length)
      const similarity = 1 - (distance / maxLength)
      
      if (similarity > maxScore) {
        maxScore = similarity
      }
    }

    return maxScore
  }

  // Levenshtein distance algorithm
  levenshteinDistance(str1, str2) {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  // Semantic search using keyword mapping
  semanticSearch(query, products) {
    if (!query || !products || products.length === 0) return []

    const semanticKeywords = this.getSemanticKeywords(query)
    const queryLower = query.toLowerCase()

    return products
      .map(product => {
        const productText = [
          product.name,
          product.description,
          product.category,
          product.tags?.join(' ') || ''
        ].join(' ').toLowerCase()

        let score = 0

        // Direct keyword matches
        if (productText.includes(queryLower)) {
          score += 2.0
        }

        // Semantic keyword matches
        for (const keyword of semanticKeywords) {
          if (productText.includes(keyword.toLowerCase())) {
            score += 1.0
          }
        }

        // Category relevance
        if (this.isCategoryRelevant(queryLower, product.category)) {
          score += 0.5
        }

        return { product, score }
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.product)
  }

  // Get semantic keywords for a query
  getSemanticKeywords(query) {
    const keywordMap = {
      // Electronics
      'phone': ['mobile', 'smartphone', 'cell', 'telephone'],
      'laptop': ['computer', 'notebook', 'pc', 'macbook'],
      'headphones': ['earphones', 'earbuds', 'audio', 'sound'],
      'camera': ['photography', 'photo', 'lens', 'dslr'],
      
      // Fashion
      'dress': ['gown', 'frock', 'outfit', 'clothing'],
      'shoes': ['footwear', 'sneakers', 'boots', 'sandals'],
      'bag': ['purse', 'handbag', 'backpack', 'tote'],
      'watch': ['timepiece', 'wristwatch', 'clock'],
      
      // Home & Garden
      'furniture': ['chair', 'table', 'sofa', 'bed', 'desk'],
      'kitchen': ['cookware', 'utensils', 'appliances', 'tools'],
      'decor': ['decoration', 'ornament', 'art', 'picture'],
      
      // Health & Beauty
      'skincare': ['beauty', 'cosmetics', 'cream', 'lotion'],
      'supplements': ['vitamins', 'health', 'wellness', 'nutrition'],
      'fitness': ['exercise', 'workout', 'gym', 'sports']
    }

    const keywords = []
    const queryLower = query.toLowerCase()

    for (const [key, synonyms] of Object.entries(keywordMap)) {
      if (queryLower.includes(key)) {
        keywords.push(...synonyms)
      }
      for (const synonym of synonyms) {
        if (queryLower.includes(synonym)) {
          keywords.push(key, ...synonyms.filter(s => s !== synonym))
        }
      }
    }

    return [...new Set(keywords)]
  }

  // Check if category is relevant to query
  isCategoryRelevant(query, category) {
    const categoryKeywords = {
      'electronics': ['phone', 'laptop', 'computer', 'gadget', 'tech', 'digital'],
      'fashion': ['clothing', 'dress', 'shirt', 'pants', 'shoes', 'accessories'],
      'home': ['furniture', 'decoration', 'kitchen', 'bedroom', 'living'],
      'beauty': ['skincare', 'makeup', 'cosmetics', 'beauty', 'health'],
      'sports': ['fitness', 'exercise', 'gym', 'outdoor', 'athletic'],
      'books': ['book', 'reading', 'literature', 'education', 'study']
    }

    const keywords = categoryKeywords[category?.toLowerCase()] || []
    return keywords.some(keyword => query.includes(keyword))
  }

  // Advanced search with multiple algorithms
  advancedSearch(query, products, options = {}) {
    const {
      algorithm = SEARCH_ALGORITHMS.FUZZY_SEMANTIC,
      filters = {},
      sortBy = SORT_OPTIONS.RELEVANCE,
      limit = 50,
      offset = 0
    } = options

    let results = []

    // Apply search algorithm
    switch (algorithm) {
      case SEARCH_ALGORITHMS.FUZZY: {
        results = this.fuzzySearch(query, products)
        break
      }
      case SEARCH_ALGORITHMS.SEMANTIC: {
        results = this.semanticSearch(query, products)
        break
      }
      case SEARCH_ALGORITHMS.FUZZY_SEMANTIC: {
        const fuzzyResults = this.fuzzySearch(query, products, 0.4)
        const semanticResults = this.semanticSearch(query, products)
        results = this.mergeSearchResults(fuzzyResults, semanticResults)
        break
      }
      default: {
        results = products
      }
    }

    // Apply filters
    results = this.applyFilters(results, filters)

    // Apply sorting
    results = this.applySorting(results, sortBy)

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit)

    // Log search analytics
    this.logSearchAnalytics(query, results.length, paginatedResults.length)

    return {
      results: paginatedResults,
      total: results.length,
      hasMore: offset + limit < results.length,
      filters: this.getAppliedFilters(filters),
      sortBy,
      algorithm
    }
  }

  // Merge search results from different algorithms
  mergeSearchResults(fuzzyResults, semanticResults) {
    const mergedMap = new Map()

    // Add fuzzy results with higher weight
    fuzzyResults.forEach((product, index) => {
      mergedMap.set(product.id, {
        product,
        score: 2.0 - (index * 0.1) // Higher score for fuzzy matches
      })
    })

    // Add semantic results
    semanticResults.forEach((product, index) => {
      const existing = mergedMap.get(product.id)
      if (existing) {
        existing.score += 1.0 - (index * 0.05) // Boost existing matches
      } else {
        mergedMap.set(product.id, {
          product,
          score: 1.0 - (index * 0.05)
        })
      }
    })

    return Array.from(mergedMap.values())
      .sort((a, b) => b.score - a.score)
      .map(item => item.product)
  }

  // Apply search filters
  applyFilters(products, filters) {
    return products.filter(product => {
      // Price range filter
      if (filters.priceRange) {
        const { min, max } = filters.priceRange
        if (min !== undefined && product.price < min) return false
        if (max !== undefined && product.price > max) return false
      }

      // Category filter
      if (filters.category && filters.category !== 'all') {
        if (product.category !== filters.category) return false
      }

      // Brand filter
      if (filters.brand && filters.brand.length > 0) {
        if (!filters.brand.includes(product.brand)) return false
      }

      // Rating filter
      if (filters.rating) {
        if (!product.rating || product.rating < filters.rating) return false
      }

      // Availability filter
      if (filters.availability === 'in_stock') {
        if (!product.inStock) return false
      }

      // Location filter
      if (filters.location) {
        if (!product.vendorLocation || !product.vendorLocation.includes(filters.location)) return false
      }

      // Shipping filter
      if (filters.shipping === 'free') {
        if (!product.freeShipping) return false
      }

      // Vendor rating filter
      if (filters.vendorRating) {
        if (!product.vendorRating || product.vendorRating < filters.vendorRating) return false
      }

      return true
    })
  }

  // Apply sorting
  applySorting(products, sortBy) {
    switch (sortBy) {
      case SORT_OPTIONS.PRICE_ASC:
        return [...products].sort((a, b) => (a.price || 0) - (b.price || 0))
      case SORT_OPTIONS.PRICE_DESC:
        return [...products].sort((a, b) => (b.price || 0) - (a.price || 0))
      case SORT_OPTIONS.RATING:
        return [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0))
      case SORT_OPTIONS.NEWEST:
        return [...products].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      case SORT_OPTIONS.POPULARITY:
        return [...products].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      default:
        return products // Keep relevance order
    }
  }

  // Get applied filters for display
  getAppliedFilters(filters) {
    const applied = []
    
    if (filters.priceRange) {
      const { min, max } = filters.priceRange
      applied.push(`Price: $${min || 0} - $${max || '∞'}`)
    }
    
    if (filters.category && filters.category !== 'all') {
      applied.push(`Category: ${filters.category}`)
    }
    
    if (filters.brand && filters.brand.length > 0) {
      applied.push(`Brand: ${filters.brand.join(', ')}`)
    }
    
    if (filters.rating) {
      applied.push(`Rating: ${filters.rating}+ stars`)
    }
    
    if (filters.availability === 'in_stock') {
      applied.push('In Stock Only')
    }
    
    if (filters.shipping === 'free') {
      applied.push('Free Shipping')
    }

    return applied
  }

  // Generate search suggestions
  generateSearchSuggestions(query, products, userHistory = []) {
    if (!query || query.length < 2) return []

    const suggestions = new Set()
    const queryLower = query.toLowerCase()

    // Add from product names
    products.forEach(product => {
      const name = product.name.toLowerCase()
      if (name.includes(queryLower)) {
        const words = name.split(/\s+/)
        words.forEach(word => {
          if (word.startsWith(queryLower) && word.length > query.length) {
            suggestions.add(word)
          }
        })
      }
    })

    // Add from categories
    const categories = [...new Set(products.map(p => p.category))]
    categories.forEach(category => {
      if (category.toLowerCase().includes(queryLower)) {
        suggestions.add(category)
      }
    })

    // Add from user search history
    userHistory.forEach(historyQuery => {
      if (historyQuery.toLowerCase().includes(queryLower)) {
        suggestions.add(historyQuery)
      }
    })

    // Add semantic suggestions
    const semanticKeywords = this.getSemanticKeywords(query)
    semanticKeywords.forEach(keyword => {
      if (keyword.toLowerCase().includes(queryLower)) {
        suggestions.add(keyword)
      }
    })

    return Array.from(suggestions).slice(0, 10)
  }

  // Generate search recommendations
  generateSearchRecommendations(userId, products, userHistory = []) {
    const recommendations = []

    // Popular searches
    const popularSearches = this.getPopularSearches()
    recommendations.push({
      type: 'popular',
      title: 'Popular Searches',
      items: popularSearches.slice(0, 5)
    })

    // Trending categories
    const trendingCategories = this.getTrendingCategories(products)
    recommendations.push({
      type: 'trending',
      title: 'Trending Categories',
      items: trendingCategories.slice(0, 5)
    })

    // Based on user history
    if (userHistory.length > 0) {
      const historyRecommendations = this.getHistoryBasedRecommendations(userHistory, products)
      recommendations.push({
        type: 'personalized',
        title: 'Based on Your Searches',
        items: historyRecommendations.slice(0, 5)
      })
    }

    // Seasonal recommendations
    const seasonalRecommendations = this.getSeasonalRecommendations()
    recommendations.push({
      type: 'seasonal',
      title: 'Seasonal Favorites',
      items: seasonalRecommendations.slice(0, 5)
    })

    return recommendations
  }

  // Get popular searches
  getPopularSearches() {
    const popularSearches = [
      'laptop',
      'smartphone',
      'headphones',
      'dress',
      'shoes',
      'watch',
      'bag',
      'skincare',
      'furniture',
      'books'
    ]
    return popularSearches
  }

  // Get trending categories
  getTrendingCategories(products) {
    const categoryCounts = {}
    products.forEach(product => {
      if (product.category) {
        categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1
      }
    })

    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => category)
  }

  // Get history-based recommendations
  getHistoryBasedRecommendations(userHistory, products) {
    const categoryPreferences = {}
    const brandPreferences = {}

    // Analyze user preferences from history
    userHistory.forEach(query => {
      const relatedProducts = this.semanticSearch(query, products)
      relatedProducts.forEach(product => {
        if (product.category) {
          categoryPreferences[product.category] = (categoryPreferences[product.category] || 0) + 1
        }
        if (product.brand) {
          brandPreferences[product.brand] = (brandPreferences[product.brand] || 0) + 1
        }
      })
    })

    // Generate recommendations based on preferences
    const recommendations = []
    
    // Top categories
    const topCategories = Object.entries(categoryPreferences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category)

    // Top brands
    const topBrands = Object.entries(brandPreferences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([brand]) => brand)

    recommendations.push(...topCategories, ...topBrands)
    return recommendations
  }

  // Get seasonal recommendations
  getSeasonalRecommendations() {
    const month = new Date().getMonth()
    const seasonal = {
      0: ['winter clothing', 'heating', 'cozy furniture'], // January
      1: ['valentine gifts', 'romantic items', 'chocolate'], // February
      2: ['spring clothing', 'gardening', 'outdoor furniture'], // March
      3: ['spring fashion', 'outdoor gear', 'gardening tools'], // April
      4: ['summer clothing', 'beach items', 'outdoor furniture'], // May
      5: ['summer fashion', 'swimwear', 'outdoor equipment'], // June
      6: ['summer items', 'vacation gear', 'outdoor activities'], // July
      7: ['back to school', 'office supplies', 'fall preparation'], // August
      8: ['fall clothing', 'autumn decor', 'harvest items'], // September
      9: ['halloween', 'fall fashion', 'autumn decorations'], // October
      10: ['thanksgiving', 'holiday prep', 'warm clothing'], // November
      11: ['christmas', 'holiday gifts', 'winter items'] // December
    }

    return seasonal[month] || ['trending items', 'popular products', 'new arrivals']
  }

  // Log search analytics
  logSearchAnalytics(query, totalResults, displayedResults) {
    const analytics = {
      query,
      totalResults,
      displayedResults,
      timestamp: new Date(),
      success: displayedResults > 0
    }

    this.searchAnalytics.set(query, analytics)
    errorLogger.info('Search analytics logged', analytics)
  }

  // Get search analytics
  getSearchAnalytics() {
    return Array.from(this.searchAnalytics.values())
  }

  // Cache search results
  cacheSearchResults(key, results) {
    this.searchCache.set(key, {
      results,
      timestamp: new Date()
    })
  }

  // Get cached search results
  getCachedSearchResults(key, maxAge = 300000) { // 5 minutes default
    const cached = this.searchCache.get(key)
    if (cached && (new Date() - cached.timestamp) < maxAge) {
      return cached.results
    }
    return null
  }

  // Clear cache
  clearCache() {
    this.searchCache.clear()
  }
}

// Export singleton instance
export const advancedSearchService = new AdvancedSearchService()
export default advancedSearchService
