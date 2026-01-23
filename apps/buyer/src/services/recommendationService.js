// Recommendation types
export const RECOMMENDATION_TYPES = {
  COLLABORATIVE: 'collaborative',
  CONTENT_BASED: 'content_based',
  HYBRID: 'hybrid',
  TRENDING: 'trending',
  SEASONAL: 'seasonal',
  PERSONALIZED: 'personalized'
}

// Recommendation algorithms
export const RECOMMENDATION_ALGORITHMS = {
  USER_BASED_CF: 'user_based_cf',
  ITEM_BASED_CF: 'item_based_cf',
  CONTENT_FILTERING: 'content_filtering',
  MATRIX_FACTORIZATION: 'matrix_factorization',
  DEEP_LEARNING: 'deep_learning'
}

class RecommendationService {
  constructor() {
    this.userProfiles = new Map()
    this.productFeatures = new Map()
    this.userInteractions = new Map()
    this.recommendationCache = new Map()
    this.trendingProducts = []
    this.seasonalProducts = []
  }

  // Build user profile based on interactions
  buildUserProfile(userId, interactions = []) {
    const profile = {
      userId,
      preferences: {
        categories: new Map(),
        brands: new Map(),
        priceRange: { min: Infinity, max: 0 },
        styles: new Map(),
        features: new Map()
      },
      behavior: {
        totalInteractions: 0,
        avgSessionDuration: 0,
        preferredTime: null,
        deviceType: null
      },
      demographics: {
        age: null,
        location: null,
        gender: null
      },
      lastUpdated: new Date()
    }

    // Analyze interactions
    interactions.forEach(interaction => {
      const { type, product, duration } = interaction

      // Update preferences based on interaction type
      switch (type) {
        case 'view':
          this.updateCategoryPreference(profile.preferences.categories, product.category, 1)
          this.updateBrandPreference(profile.preferences.brands, product.brand, 1)
          this.updatePriceRange(profile.preferences.priceRange, product.price)
          break
        case 'add_to_cart':
          this.updateCategoryPreference(profile.preferences.categories, product.category, 3)
          this.updateBrandPreference(profile.preferences.brands, product.brand, 3)
          this.updatePriceRange(profile.preferences.priceRange, product.price)
          break
        case 'purchase':
          this.updateCategoryPreference(profile.preferences.categories, product.category, 5)
          this.updateBrandPreference(profile.preferences.brands, product.brand, 5)
          this.updatePriceRange(profile.preferences.priceRange, product.price)
          break
        case 'like':
          this.updateCategoryPreference(profile.preferences.categories, product.category, 4)
          this.updateBrandPreference(profile.preferences.brands, product.brand, 4)
          break
        case 'dislike':
          this.updateCategoryPreference(profile.preferences.categories, product.category, -2)
          this.updateBrandPreference(profile.preferences.brands, product.brand, -2)
          break
      }

      // Update behavior
      profile.behavior.totalInteractions++
      if (duration) {
        profile.behavior.avgSessionDuration = 
          (profile.behavior.avgSessionDuration + duration) / 2
      }
    })

    // Normalize preferences
    this.normalizePreferences(profile.preferences)
    
    this.userProfiles.set(userId, profile)
    return profile
  }

  // Update category preference
  updateCategoryPreference(categoryMap, category, weight) {
    if (!category) return
    
    const current = categoryMap.get(category) || 0
    categoryMap.set(category, current + weight)
  }

  // Update brand preference
  updateBrandPreference(brandMap, brand, weight) {
    if (!brand) return
    
    const current = brandMap.get(brand) || 0
    brandMap.set(brand, current + weight)
  }

  // Update price range
  updatePriceRange(priceRange, price) {
    if (!price) return
    
    priceRange.min = Math.min(priceRange.min, price)
    priceRange.max = Math.max(priceRange.max, price)
  }

  // Normalize preferences to 0-1 range
  normalizePreferences(preferences) {
    // Normalize categories
    const maxCategoryScore = Math.max(...preferences.categories.values())
    if (maxCategoryScore > 0) {
      for (const [category, score] of preferences.categories.entries()) {
        preferences.categories.set(category, score / maxCategoryScore)
      }
    }

    // Normalize brands
    const maxBrandScore = Math.max(...preferences.brands.values())
    if (maxBrandScore > 0) {
      for (const [brand, score] of preferences.brands.entries()) {
        preferences.brands.set(brand, score / maxBrandScore)
      }
    }
  }

  // Content-based filtering
  contentBasedRecommendations(userId, products, limit = 10) {
    const userProfile = this.userProfiles.get(userId)
    if (!userProfile) return []

    const recommendations = products
      .map(product => {
        let score = 0

        // Category match
        if (product.category && userProfile.preferences.categories.has(product.category)) {
          score += userProfile.preferences.categories.get(product.category) * 0.4
        }

        // Brand match
        if (product.brand && userProfile.preferences.brands.has(product.brand)) {
          score += userProfile.preferences.brands.get(product.brand) * 0.3
        }

        // Price preference
        if (product.price) {
          const priceRange = userProfile.preferences.priceRange
          if (priceRange.min !== Infinity && priceRange.max !== 0) {
            const avgPrice = (priceRange.min + priceRange.max) / 2
            const priceDiff = Math.abs(product.price - avgPrice) / avgPrice
            score += Math.max(0, 1 - priceDiff) * 0.2
          }
        }

        // Product features
        if (product.features) {
          product.features.forEach(feature => {
            if (userProfile.preferences.features.has(feature)) {
              score += userProfile.preferences.features.get(feature) * 0.1
            }
          })
        }

        return { product, score }
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.product)

    return recommendations
  }

  // Collaborative filtering (user-based)
  userBasedCollaborativeFiltering(userId, products, users, limit = 10) {
    const targetUser = this.userProfiles.get(userId)
    if (!targetUser) return []

    // Find similar users
    const similarUsers = this.findSimilarUsers(userId, users)
    
    const recommendations = new Map()

    // Get recommendations from similar users
    similarUsers.forEach(({ userId: similarUserId, similarity }) => {
      const similarUserProfile = this.userProfiles.get(similarUserId)
      if (!similarUserProfile) return

      // Get products liked by similar user
      const likedProducts = this.getUserLikedProducts(similarUserId)
      
      likedProducts.forEach(product => {
        const currentScore = recommendations.get(product.id) || 0
        recommendations.set(product.id, currentScore + similarity)
      })
    })

    // Filter out products already interacted with by target user
    const userInteractions = this.userInteractions.get(userId) || []
    const interactedProductIds = new Set(userInteractions.map(i => i.product.id))

    return Array.from(recommendations.entries())
      .filter(([productId]) => !interactedProductIds.has(productId))
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([productId]) => products.find(p => p.id === productId))
      .filter(Boolean)
  }

  // Find similar users
  findSimilarUsers(userId, users, limit = 10) {
    const targetUser = this.userProfiles.get(userId)
    if (!targetUser) return []

    const similarities = []

    users.forEach(otherUserId => {
      if (otherUserId === userId) return

      const otherUser = this.userProfiles.get(otherUserId)
      if (!otherUser) return

      const similarity = this.calculateUserSimilarity(targetUser, otherUser)
      if (similarity > 0.1) {
        similarities.push({ userId: otherUserId, similarity })
      }
    })

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  // Calculate user similarity using cosine similarity
  calculateUserSimilarity(user1, user2) {
    const categories1 = user1.preferences.categories
    const categories2 = user2.preferences.categories
    const brands1 = user1.preferences.brands
    const brands2 = user2.preferences.brands

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    // Category similarity
    for (const [category, score1] of categories1.entries()) {
      const score2 = categories2.get(category) || 0
      dotProduct += score1 * score2
      norm1 += score1 * score1
      norm2 += score2 * score2
    }

    // Brand similarity
    for (const [brand, score1] of brands1.entries()) {
      const score2 = brands2.get(brand) || 0
      dotProduct += score1 * score2
      norm1 += score1 * score1
      norm2 += score2 * score2
    }

    if (norm1 === 0 || norm2 === 0) return 0

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  // Get user liked products
  getUserLikedProducts(userId) {
    const interactions = this.userInteractions.get(userId) || []
    return interactions
      .filter(i => ['purchase', 'like', 'add_to_cart'].includes(i.type))
      .map(i => i.product)
  }

  // Hybrid recommendations
  hybridRecommendations(userId, products, users, limit = 10) {
    const contentBased = this.contentBasedRecommendations(userId, products, limit * 2)
    const collaborative = this.userBasedCollaborativeFiltering(userId, products, users, limit * 2)

    // Combine and rank recommendations
    const combined = new Map()

    // Add content-based recommendations with weight 0.6
    contentBased.forEach((product, index) => {
      const score = (limit - index) / limit * 0.6
      combined.set(product.id, { product, score, type: 'content' })
    })

    // Add collaborative recommendations with weight 0.4
    collaborative.forEach((product, index) => {
      const existing = combined.get(product.id)
      if (existing) {
        existing.score += (limit - index) / limit * 0.4
        existing.type = 'hybrid'
      } else {
        combined.set(product.id, { 
          product, 
          score: (limit - index) / limit * 0.4, 
          type: 'collaborative' 
        })
      }
    })

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.product)
  }

  // Trending products
  getTrendingProducts(products, timeWindow = 24) {
    const now = new Date()
    const cutoffTime = new Date(now.getTime() - timeWindow * 60 * 60 * 1000)

    const trending = products
      .map(product => {
        const recentInteractions = this.getRecentInteractions(product.id, cutoffTime)
        const trendScore = this.calculateTrendScore(recentInteractions)
        return { product, trendScore }
      })
      .filter(item => item.trendScore > 0)
      .sort((a, b) => b.trendScore - a.trendScore)
      .map(item => item.product)

    this.trendingProducts = trending
    return trending
  }

  // Get recent interactions for a product
  getRecentInteractions(productId, cutoffTime) {
    const interactions = []
    
    for (const userInteractions of this.userInteractions.values()) {
      const recent = userInteractions.filter(i => 
        i.product.id === productId && i.timestamp >= cutoffTime
      )
      interactions.push(...recent)
    }

    return interactions
  }

  // Calculate trend score
  calculateTrendScore(interactions) {
    const weights = {
      'view': 1,
      'like': 3,
      'add_to_cart': 5,
      'purchase': 10,
      'share': 2
    }

    return interactions.reduce((score, interaction) => {
      return score + (weights[interaction.type] || 0)
    }, 0)
  }

  // Seasonal recommendations
  getSeasonalRecommendations(products) {
    const month = new Date().getMonth()
    const seasonalCategories = this.getSeasonalCategories(month)
    
    const seasonal = products
      .filter(product => seasonalCategories.includes(product.category))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))

    this.seasonalProducts = seasonal
    return seasonal
  }

  // Get seasonal categories
  getSeasonalCategories(month) {
    const seasonalMap = {
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

    return seasonalMap[month] || ['general', 'popular']
  }

  // Personalized recommendations
  getPersonalizedRecommendations(userId, products, limit = 10) {
    const userProfile = this.userProfiles.get(userId)
    if (!userProfile) return []

    // Get different types of recommendations
    const contentBased = this.contentBasedRecommendations(userId, products, limit)
    const trending = this.trendingProducts.slice(0, limit)
    const seasonal = this.seasonalProducts.slice(0, limit)

    // Combine with weights based on user behavior
    const weights = {
      content: 0.5,
      trending: 0.3,
      seasonal: 0.2
    }

    const combined = new Map()

    // Add content-based recommendations
    contentBased.forEach((product, index) => {
      const score = (limit - index) / limit * weights.content
      combined.set(product.id, { product, score, type: 'content' })
    })

    // Add trending recommendations
    trending.forEach((product, index) => {
      const existing = combined.get(product.id)
      if (existing) {
        existing.score += (limit - index) / limit * weights.trending
      } else {
        combined.set(product.id, { 
          product, 
          score: (limit - index) / limit * weights.trending, 
          type: 'trending' 
        })
      }
    })

    // Add seasonal recommendations
    seasonal.forEach((product, index) => {
      const existing = combined.get(product.id)
      if (existing) {
        existing.score += (limit - index) / limit * weights.seasonal
      } else {
        combined.set(product.id, { 
          product, 
          score: (limit - index) / limit * weights.seasonal, 
          type: 'seasonal' 
        })
      }
    })

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.product)
  }

  // Record user interaction
  recordInteraction(userId, interaction) {
    const interactions = this.userInteractions.get(userId) || []
    interactions.push({
      ...interaction,
      timestamp: new Date()
    })
    this.userInteractions.set(userId, interactions)

    // Update user profile
    this.buildUserProfile(userId, interactions)
  }

  // Get recommendation explanations
  getRecommendationExplanation(product, recommendationType, userProfile) {
    const explanations = []

    switch (recommendationType) {
      case 'content':
        if (userProfile.preferences.categories.has(product.category)) {
          explanations.push(`Because you like ${product.category} products`)
        }
        if (userProfile.preferences.brands.has(product.brand)) {
          explanations.push(`Because you prefer ${product.brand} brand`)
        }
        break
      case 'trending':
        explanations.push('This is trending right now')
        break
      case 'seasonal':
        explanations.push('Perfect for this season')
        break
      case 'collaborative':
        explanations.push('Similar users also liked this')
        break
    }

    return explanations.length > 0 ? explanations.join(', ') : 'Recommended for you'
  }

  // Clear user data
  clearUserData(userId) {
    this.userProfiles.delete(userId)
    this.userInteractions.delete(userId)
    this.recommendationCache.delete(userId)
  }

  // Get recommendation analytics
  getRecommendationAnalytics() {
    return {
      totalUsers: this.userProfiles.size,
      totalInteractions: Array.from(this.userInteractions.values())
        .reduce((total, interactions) => total + interactions.length, 0),
      trendingProductsCount: this.trendingProducts.length,
      seasonalProductsCount: this.seasonalProducts.length
    }
  }
}

// Export singleton instance
export const recommendationService = new RecommendationService()
export default recommendationService
