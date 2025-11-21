import { useState, useEffect, useCallback, useRef } from 'react'
import secureStorage from '../utils/secureStorage'
import { useAuth } from '../contexts/AuthContext'
import advancedSearchService, { SEARCH_ALGORITHMS, SORT_OPTIONS } from '../services/advancedSearchService'
import recommendationService from '../services/recommendationService'
import { errorLogger } from '../utils/errorLogger'

export const useAdvancedSearch = () => {
  const [searchResults, setSearchResults] = useState([])
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchRecommendations, setSearchRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchHistory, setSearchHistory] = useState([])
  const [currentQuery, setCurrentQuery] = useState('')
  const [totalResults, setTotalResults] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  
  const { currentUser } = useAuth()
  const searchTimeoutRef = useRef(null)
  const cacheRef = useRef(new Map())

  // Load search history (encrypted)
  useEffect(() => {
    (async () => {
      const savedHistory = await secureStorage.getItem('searchHistory')
      if (savedHistory) {
        try {
          setSearchHistory(JSON.parse(savedHistory))
        } catch (error) {
          errorLogger.error('Failed to load search history', error)
        }
      }
    })()
  }, [])

  // Save search history (encrypted)
  useEffect(() => {
    (async () => {
      if (searchHistory.length > 0) {
        await secureStorage.setItem('searchHistory', JSON.stringify(searchHistory))
      }
    })()
  }, [searchHistory])

  // Perform advanced search
  const performSearch = useCallback(async (
    query,
    products,
    options = {}
  ) => {
    if (!query || !products || products.length === 0) {
      setSearchResults([])
      setTotalResults(0)
      setHasMore(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setCurrentQuery(query)

    try {
      // Check cache first
      const cacheKey = `${query}-${JSON.stringify(options)}`
      const cachedResults = advancedSearchService.getCachedSearchResults(cacheKey)
      
      if (cachedResults) {
        setSearchResults(cachedResults.results)
        setTotalResults(cachedResults.total)
        setHasMore(cachedResults.hasMore)
        setIsLoading(false)
        return cachedResults
      }

      // Perform search
      const results = await advancedSearchService.advancedSearch(query, products, options)
      
      // Cache results
      advancedSearchService.cacheSearchResults(cacheKey, results)
      
      // Update state
      setSearchResults(results.results)
      setTotalResults(results.total)
      setHasMore(results.hasMore)

      // Add to search history
      addToSearchHistory(query)

      // Record interaction for recommendations
      if (currentUser) {
        recommendationService.recordInteraction(currentUser.uid, {
          type: 'search',
          query,
          timestamp: new Date(),
          resultCount: results.total
        })
      }

      setIsLoading(false)
      return results
    } catch (error) {
      errorLogger.error('Search failed', error)
      setError('Search failed. Please try again.')
      setIsLoading(false)
      return null
    }
  }, [currentUser])

  // Debounced search
  const debouncedSearch = useCallback((
    query,
    products,
    options = {},
    delay = 300
  ) => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query, products, options)
    }, delay)
  }, [performSearch])

  // Generate search suggestions
  const generateSuggestions = useCallback(async (query, products) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([])
      return
    }

    try {
      const suggestions = advancedSearchService.generateSearchSuggestions(
        query,
        products,
        searchHistory
      )
      setSearchSuggestions(suggestions)
    } catch (error) {
      errorLogger.error('Failed to generate suggestions', error)
    }
  }, [searchHistory])

  // Generate search recommendations
  const generateRecommendations = useCallback(async (products) => {
    try {
      const recommendations = advancedSearchService.generateSearchRecommendations(
        currentUser?.uid,
        products,
        searchHistory
      )
      setSearchRecommendations(recommendations)
    } catch (error) {
      errorLogger.error('Failed to generate recommendations', error)
    }
  }, [currentUser, searchHistory])

  // Add to search history
  const addToSearchHistory = useCallback((query) => {
    if (!query || query.trim() === '') return

    const trimmedQuery = query.trim().toLowerCase()
    
    setSearchHistory(prev => {
      // Remove if already exists
      const filtered = prev.filter(item => item !== trimmedQuery)
      // Add to beginning
      const updated = [trimmedQuery, ...filtered].slice(0, 20) // Keep last 20 searches
      return updated
    })
  }, [])

  // Clear search history
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([])
    secureStorage.removeItem('searchHistory')
  }, [])

  // Clear search results
  const clearSearchResults = useCallback(() => {
    setSearchResults([])
    setTotalResults(0)
    setHasMore(false)
    setCurrentQuery('')
    setError(null)
  }, [])

  // Get trending searches
  const getTrendingSearches = useCallback(() => {
    return advancedSearchService.getPopularSearches()
  }, [])

  // Get search analytics
  const getSearchAnalytics = useCallback(() => {
    return advancedSearchService.getSearchAnalytics()
  }, [])

  // Filter search results
  const filterResults = useCallback((filters) => {
    if (!currentQuery) return

    const options = {
      filters,
      algorithm: SEARCH_ALGORITHMS.FUZZY_SEMANTIC,
      sortBy: SORT_OPTIONS.RELEVANCE
    }

    // Clear cache for filtered results
    advancedSearchService.clearCache()
    
    // Re-perform search with filters
    performSearch(currentQuery, [], options)
  }, [currentQuery, performSearch])

  // Sort search results
  const sortResults = useCallback((sortBy) => {
    if (!currentQuery) return

    const options = {
      sortBy,
      algorithm: SEARCH_ALGORITHMS.FUZZY_SEMANTIC
    }

    // Clear cache for sorted results
    advancedSearchService.clearCache()
    
    // Re-perform search with sorting
    performSearch(currentQuery, [], options)
  }, [currentQuery, performSearch])

  // Load more results
  const loadMoreResults = useCallback(async (offset) => {
    if (!currentQuery || !hasMore) return

    try {
      const options = {
        algorithm: SEARCH_ALGORITHMS.FUZZY_SEMANTIC,
        offset,
        limit: 20
      }

      const results = await performSearch(currentQuery, [], options)
      if (results) {
        setSearchResults(prev => [...prev, ...results.results])
        setHasMore(results.hasMore)
      }
    } catch (error) {
      errorLogger.error('Failed to load more results', error)
    }
  }, [currentQuery, hasMore, performSearch])

  // Get search suggestions for autocomplete
  const getAutocompleteSuggestions = useCallback((query, products) => {
    if (!query || query.length < 2) return []

    const suggestions = []
    const queryLower = query.toLowerCase()

    // Add from search history
    searchHistory
      .filter(item => item.toLowerCase().includes(queryLower))
      .forEach(item => suggestions.push({ text: item, type: 'history' }))

    // Add from product names
    products
      .filter(product => product.name.toLowerCase().includes(queryLower))
      .slice(0, 5)
      .forEach(product => suggestions.push({ 
        text: product.name, 
        type: 'product',
        product 
      }))

    // Add from categories
    const categories = [...new Set(products.map(p => p.category))]
    categories
      .filter(category => category && category.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .forEach(category => suggestions.push({ 
        text: category, 
        type: 'category' 
      }))

    return suggestions.slice(0, 10)
  }, [searchHistory])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    searchResults,
    searchSuggestions,
    searchRecommendations,
    isLoading,
    error,
    searchHistory,
    currentQuery,
    totalResults,
    hasMore,

    // Actions
    performSearch,
    debouncedSearch,
    generateSuggestions,
    generateRecommendations,
    addToSearchHistory,
    clearSearchHistory,
    clearSearchResults,
    filterResults,
    sortResults,
    loadMoreResults,
    getAutocompleteSuggestions,

    // Utilities
    getTrendingSearches,
    getSearchAnalytics
  }
}

export default useAdvancedSearch
