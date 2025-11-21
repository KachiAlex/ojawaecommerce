import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import recommendationService, { RECOMMENDATION_TYPES } from '../services/recommendationService'
import { errorLogger } from '../utils/errorLogger'

export const useRecommendations = () => {
  const [recommendations, setRecommendations] = useState({
    personalized: [],
    trending: [],
    seasonal: [],
    collaborative: [],
    contentBased: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const { currentUser } = useAuth()

  // Generate personalized recommendations
  const generatePersonalizedRecommendations = useCallback(async (products, limit = 10) => {
    if (!currentUser || !products || products.length === 0) return []

    setIsLoading(true)
    setError(null)

    try {
      const personalizedRecs = recommendationService.getPersonalizedRecommendations(
        currentUser.uid,
        products,
        limit
      )

      setRecommendations(prev => ({
        ...prev,
        personalized: personalizedRecs
      }))

      return personalizedRecs
    } catch (error) {
      errorLogger.error('Failed to generate personalized recommendations', error)
      setError('Failed to load recommendations')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  // Generate trending recommendations
  const generateTrendingRecommendations = useCallback(async (products, limit = 10) => {
    if (!products || products.length === 0) return []

    try {
      const trendingRecs = recommendationService.getTrendingProducts(products, 24)
      
      setRecommendations(prev => ({
        ...prev,
        trending: trendingRecs.slice(0, limit)
      }))

      return trendingRecs.slice(0, limit)
    } catch (error) {
      errorLogger.error('Failed to generate trending recommendations', error)
      return []
    }
  }, [])

  // Generate seasonal recommendations
  const generateSeasonalRecommendations = useCallback(async (products, limit = 10) => {
    if (!products || products.length === 0) return []

    try {
      const seasonalRecs = recommendationService.getSeasonalRecommendations(products)
      
      setRecommendations(prev => ({
        ...prev,
        seasonal: seasonalRecs.slice(0, limit)
      }))

      return seasonalRecs.slice(0, limit)
    } catch (error) {
      errorLogger.error('Failed to generate seasonal recommendations', error)
      return []
    }
  }, [])

  // Generate collaborative filtering recommendations
  const generateCollaborativeRecommendations = useCallback(async (products, users, limit = 10) => {
    if (!currentUser || !products || products.length === 0) return []

    try {
      const collaborativeRecs = recommendationService.userBasedCollaborativeFiltering(
        currentUser.uid,
        products,
        users,
        limit
      )

      setRecommendations(prev => ({
        ...prev,
        collaborative: collaborativeRecs
      }))

      return collaborativeRecs
    } catch (error) {
      errorLogger.error('Failed to generate collaborative recommendations', error)
      return []
    }
  }, [currentUser])

  // Generate content-based recommendations
  const generateContentBasedRecommendations = useCallback(async (products, limit = 10) => {
    if (!currentUser || !products || products.length === 0) return []

    try {
      const contentBasedRecs = recommendationService.contentBasedRecommendations(
        currentUser.uid,
        products,
        limit
      )

      setRecommendations(prev => ({
        ...prev,
        contentBased: contentBasedRecs
      }))

      return contentBasedRecs
    } catch (error) {
      errorLogger.error('Failed to generate content-based recommendations', error)
      return []
    }
  }, [currentUser])

  // Generate hybrid recommendations
  const generateHybridRecommendations = useCallback(async (products, users, limit = 10) => {
    if (!currentUser || !products || products.length === 0) return []

    setIsLoading(true)
    setError(null)

    try {
      const hybridRecs = recommendationService.hybridRecommendations(
        currentUser.uid,
        products,
        users,
        limit
      )

      return hybridRecs
    } catch (error) {
      errorLogger.error('Failed to generate hybrid recommendations', error)
      setError('Failed to load recommendations')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  // Generate all recommendation types
  const generateAllRecommendations = useCallback(async (products, users = []) => {
    if (!products || products.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const promises = [
        generatePersonalizedRecommendations(products, 10),
        generateTrendingRecommendations(products, 10),
        generateSeasonalRecommendations(products, 10),
        generateCollaborativeRecommendations(products, users, 10),
        generateContentBasedRecommendations(products, 10)
      ]

      await Promise.all(promises)
    } catch (error) {
      errorLogger.error('Failed to generate all recommendations', error)
      setError('Failed to load recommendations')
    } finally {
      setIsLoading(false)
    }
  }, [
    generatePersonalizedRecommendations,
    generateTrendingRecommendations,
    generateSeasonalRecommendations,
    generateCollaborativeRecommendations,
    generateContentBasedRecommendations
  ])

  // Record user interaction
  const recordInteraction = useCallback(async (interaction) => {
    if (!currentUser) return

    try {
      recommendationService.recordInteraction(currentUser.uid, interaction)
      
      // Regenerate recommendations after interaction
      // This could be debounced in a real implementation
    } catch (error) {
      errorLogger.error('Failed to record interaction', error)
    }
  }, [currentUser])

  // Get recommendation explanation
  const getRecommendationExplanation = useCallback((product, recommendationType) => {
    if (!currentUser) return 'Recommended for you'

    const userProfile = recommendationService.userProfiles.get(currentUser.uid)
    return recommendationService.getRecommendationExplanation(
      product,
      recommendationType,
      userProfile
    )
  }, [currentUser])

  // Get user profile
  const getUserProfile = useCallback(() => {
    if (!currentUser) return null

    return recommendationService.userProfiles.get(currentUser.uid)
  }, [currentUser])

  // Get recommendation analytics
  const getRecommendationAnalytics = useCallback(() => {
    return recommendationService.getRecommendationAnalytics()
  }, [])

  // Clear user data
  const clearUserData = useCallback(() => {
    if (!currentUser) return

    recommendationService.clearUserData(currentUser.uid)
    setRecommendations({
      personalized: [],
      trending: [],
      seasonal: [],
      collaborative: [],
      contentBased: []
    })
  }, [currentUser])

  // Get similar products
  const getSimilarProducts = useCallback(async (product, products, limit = 5) => {
    if (!product || !products || products.length === 0) return []

    try {
      // Simple similarity based on category and brand
      const similar = products
        .filter(p => 
          p.id !== product.id && 
          (p.category === product.category || p.brand === product.brand)
        )
        .sort((a, b) => {
          let scoreA = 0
          let scoreB = 0

          if (a.category === product.category) scoreA += 2
          if (a.brand === product.brand) scoreA += 1
          if (b.category === product.category) scoreB += 2
          if (b.brand === product.brand) scoreB += 1

          return scoreB - scoreA
        })
        .slice(0, limit)

      return similar
    } catch (error) {
      errorLogger.error('Failed to get similar products', error)
      return []
    }
  }, [])

  // Get frequently bought together
  const getFrequentlyBoughtTogether = useCallback(async (product, products, limit = 5) => {
    if (!product || !products || products.length === 0) return []

    try {
      // This would typically use purchase history data
      // For now, return products from the same category with good ratings
      const frequentlyBought = products
        .filter(p => 
          p.id !== product.id && 
          p.category === product.category &&
          p.rating >= 4
        )
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit)

      return frequentlyBought
    } catch (error) {
      errorLogger.error('Failed to get frequently bought together', error)
      return []
    }
  }, [])

  // Get recently viewed products
  const getRecentlyViewed = useCallback(() => {
    if (!currentUser) return []

    const interactions = recommendationService.userInteractions.get(currentUser.uid) || []
    const recentViews = interactions
      .filter(i => i.type === 'view')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .map(i => i.product)
      .filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      ) // Remove duplicates

    return recentViews.slice(0, 10)
  }, [currentUser])

  // Get recommended for you based on viewing history
  const getRecommendedForYou = useCallback(async (products, limit = 10) => {
    if (!currentUser || !products || products.length === 0) return []

    try {
      const recentlyViewed = getRecentlyViewed()
      if (recentlyViewed.length === 0) return []

      // Find products similar to recently viewed
      const recommended = []
      const viewedCategories = [...new Set(recentlyViewed.map(p => p.category))]
      const viewedBrands = [...new Set(recentlyViewed.map(p => p.brand))]

      products
        .filter(p => !recentlyViewed.find(v => v.id === p.id))
        .forEach(product => {
          let score = 0
          if (viewedCategories.includes(product.category)) score += 2
          if (viewedBrands.includes(product.brand)) score += 1
          if (product.rating >= 4) score += 1

          if (score > 0) {
            recommended.push({ product, score })
          }
        })

      return recommended
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.product)
    } catch (error) {
      errorLogger.error('Failed to get recommended for you', error)
      return []
    }
  }, [currentUser, getRecentlyViewed])

  return {
    // State
    recommendations,
    isLoading,
    error,

    // Actions
    generatePersonalizedRecommendations,
    generateTrendingRecommendations,
    generateSeasonalRecommendations,
    generateCollaborativeRecommendations,
    generateContentBasedRecommendations,
    generateHybridRecommendations,
    generateAllRecommendations,
    recordInteraction,
    clearUserData,

    // Getters
    getRecommendationExplanation,
    getUserProfile,
    getRecommendationAnalytics,
    getSimilarProducts,
    getFrequentlyBoughtTogether,
    getRecentlyViewed,
    getRecommendedForYou
  }
}

export default useRecommendations
