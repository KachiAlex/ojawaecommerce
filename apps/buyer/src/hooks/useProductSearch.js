import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import firebaseService from '../services/firebaseService'
import { errorLogger } from '../utils/errorLogger'

export const useProductSearch = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Try to fetch from Firebase first
        const productsData = await firebaseService.products.getAll()
        
        if (productsData && productsData.length > 0) {
          setProducts(productsData)
        } else {
          // Fallback to sample data if Firebase is empty
          const { sampleProducts } = await import('../utils/sampleProducts')
          setProducts(sampleProducts)
        }
      } catch (error) {
        errorLogger.error('Failed to fetch products', error)
        
        // Fallback to sample data on error
        try {
          const { sampleProducts } = await import('../utils/sampleProducts')
          setProducts(sampleProducts)
        } catch (sampleError) {
          setError('Failed to load products')
          setProducts([])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products.length) return []

    let filtered = [...products]

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(product => {
        const searchFields = [
          product.name,
          product.description,
          product.brand,
          product.category,
          ...(product.features || [])
        ]
        
        return searchFields.some(field => 
          field && field.toString().toLowerCase().includes(searchLower)
        )
      })
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(product => 
        product.category === filters.category
      )
    }

    // Price range filter
    if (filters.priceRange.min || filters.priceRange.max) {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price) || 0
        const minPrice = parseFloat(filters.priceRange.min) || 0
        const maxPrice = parseFloat(filters.priceRange.max) || Infinity
        
        return price >= minPrice && price <= maxPrice
      })
    }

    // Rating filter
    if (filters.rating) {
      const minRating = parseFloat(filters.rating)
      filtered = filtered.filter(product => 
        (product.rating || 0) >= minRating
      )
    }

    // Stock filter
    if (filters.inStock) {
      filtered = filtered.filter(product => 
        product.inStock !== false && (product.stockQuantity || 0) > 0
      )
    }

    // Sort products
    switch (filters.sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0))
        break
      case 'price-high':
        filtered.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0))
        break
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        break
      case 'popular':
        filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
        break
      case 'relevance':
      default:
        // Keep original order for relevance (could be enhanced with search ranking)
        break
    }

    return filtered
  }, [products, filters])

  // Search suggestions
  const getSearchSuggestions = (query) => {
    if (!query || query.length < 2) return []
    
    const suggestions = []
    const queryLower = query.toLowerCase()
    
    // Category suggestions
    const categories = [...new Set(products.map(p => p.category))]
    categories.forEach(category => {
      if (category.toLowerCase().includes(queryLower)) {
        suggestions.push({
          type: 'category',
          text: category,
          value: category
        })
      }
    })
    
    // Brand suggestions
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))]
    brands.forEach(brand => {
      if (brand.toLowerCase().includes(queryLower)) {
        suggestions.push({
          type: 'brand',
          text: brand,
          value: brand
        })
      }
    })
    
    // Product name suggestions
    products.slice(0, 5).forEach(product => {
      if (product.name.toLowerCase().includes(queryLower)) {
        suggestions.push({
          type: 'product',
          text: product.name,
          value: product.name
        })
      }
    })
    
    return suggestions.slice(0, 8)
  }

  // Get filter counts
  const getFilterCounts = () => {
    const counts = {
      categories: {},
      priceRanges: {
        'under-50': 0,
        '50-100': 0,
        '100-500': 0,
        'over-500': 0
      },
      ratings: {
        '5': 0,
        '4': 0,
        '3': 0,
        '2': 0,
        '1': 0
      },
      inStock: 0
    }

    products.forEach(product => {
      // Category counts
      const category = product.category || 'uncategorized'
      counts.categories[category] = (counts.categories[category] || 0) + 1

      // Price range counts
      const price = parseFloat(product.price) || 0
      if (price < 50) counts.priceRanges['under-50']++
      else if (price <= 100) counts.priceRanges['50-100']++
      else if (price <= 500) counts.priceRanges['100-500']++
      else counts.priceRanges['over-500']++

      // Rating counts
      const rating = Math.floor(product.rating || 0)
      if (rating >= 5) counts.ratings['5']++
      else if (rating >= 4) counts.ratings['4']++
      else if (rating >= 3) counts.ratings['3']++
      else if (rating >= 2) counts.ratings['2']++
      else if (rating >= 1) counts.ratings['1']++

      // Stock count
      if (product.inStock !== false && (product.stockQuantity || 0) > 0) {
        counts.inStock++
      }
    })

    return counts
  }

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(products.map(p => p.category).filter(Boolean))]
  }, [products])

  return {
    products: filteredProducts,
    allProducts: products,
    loading,
    error,
    filters,
    categories,
    getSearchSuggestions,
    getFilterCounts,
    totalCount: filteredProducts.length,
    hasFilters: Object.values(filters).some(v => 
      v && (typeof v !== 'object' || (v.min || v.max))
    )
  }
}
