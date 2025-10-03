import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRealTimeProducts } from './useRealTimeProducts'
import firebaseService from '../services/firebaseService'
import { errorLogger } from '../utils/errorLogger'

export const useProductSearch = () => {
  const [searchParams] = useSearchParams()

  // Get filters from URL params
  const filters = useMemo(() => ({
    searchTerm: searchParams.get('q') || '',
    category: searchParams.get('category') || 'all',
    priceRange: {
      min: searchParams.get('minPrice') || '',
      max: searchParams.get('maxPrice') || ''
    },
    rating: searchParams.get('rating') || '',
    sortBy: searchParams.get('sort') || 'relevance',
    inStock: searchParams.get('inStock') === 'true'
  }), [searchParams])

  // Use real-time products hook
  const {
    products,
    allProducts,
    loading,
    error,
    categories,
    getFilterCounts,
    getSearchSuggestions,
    totalCount,
    hasFilters
  } = useRealTimeProducts(filters)

  return {
    products,
    allProducts,
    loading,
    error,
    filters,
    categories,
    getSearchSuggestions,
    getFilterCounts,
    totalCount,
    hasFilters
  }
}
