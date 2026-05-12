/**
 * Query Optimization Service
 * 
 * Provides query optimization tools:
 * - Automatic query paging
 * - Request batching
 * - Index recommendations
 * - Query cost estimation
 * - Performance analysis
 * 
 * Usage:
 *   const paginatedQuery = queryOptimizer.paginate(collection, {
 *     pageSize: 50,
 *     orderBy: 'timestamp',
 *     direction: 'desc'
 *   });
 *   
 *   const results = await paginatedQuery.getPage(1);
 *   const next = await paginatedQuery.getNextPage();
 */

import axios from 'axios'
import { analyticsCache } from './analyticsCache';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

class QueryOptimizationService {
  constructor() {
    this.queryCache = new Map();
    this.paginationStates = new Map();
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      batchedQueries: 0
    };
  }

  /**
   * Create paginated query helper
   * @param {string} collectionName - Firestore collection name
   * @param {Object} options - Query options
   * @returns {Object} Pagination helper
   */
  createPaginatedQuery(collectionName, options = {}) {
    const {
      pageSize = 50,
      orderByField = 'created_at',
      orderDirection = 'desc',
      filters = [],
      cacheKey = null,
      cacheTTL = 300000
    } = options;

    const paginationKey = `${collectionName}_${Date.now()}_${Math.random()}`;
    const state = {
      collectionName,
      pageSize,
      orderByField,
      orderDirection,
      filters,
      currentPage: 1,
      lastSnapshot: null,
      totalCount: null,
      cacheKey,
      cacheTTL,
      pages: new Map()
    };

    this.paginationStates.set(paginationKey, state);

    return {
      /**
       * Get specific page
       */
      getPage: async (pageNumber = 1) => {
        try {
          // Check cache first
          if (state.cacheKey) {
            const cached = analyticsCache.get(`${state.cacheKey}:page_${pageNumber}`);
            if (cached) {
              return cached;
            }
          }

          // Request backend for paginated data (server handles filters/order/pagination)
          const resp = await axios.get(`${API_BASE}/api/${collectionName}`, {
            params: {
              page: pageNumber,
              pageSize,
              orderBy: orderByField,
              orderDirection,
              filters: JSON.stringify(state.filters || [])
            }
          });
          const respData = resp?.data || {};
          const data = respData.items || respData.data || [];
          const hasMore = !!respData.hasMore;

          // Cache result
          if (state.cacheKey) {
            analyticsCache.set(`${state.cacheKey}:page_${pageNumber}`, {
              data,
              hasMore,
              pageNumber,
              pageSize
            }, state.cacheTTL);
          }

          state.pages.set(pageNumber, data);
          state.currentPage = pageNumber;
          state.lastSnapshot = data.length > 0 ? data[data.length - 1] : null;

          return { data, hasMore, pageNumber, pageSize };
        } catch (error) {
          console.error('Pagination error:', error);
          return { data: [], hasMore: false, error: error.message };
        }
      },

      /**
       * Get next page
       */
      getNextPage: async () => {
        return this.getPage(state.currentPage + 1);
      },

      /**
       * Get previous page
       */
      getPreviousPage: async () => {
        return this.getPage(Math.max(1, state.currentPage - 1));
      },

      /**
       * Get total count (with caching)
       */
      getTotalCount: async () => {
        try {
          if (state.totalCount !== null) {
            return state.totalCount;
          }

          const resp = await axios.get(`${API_BASE}/api/${collectionName}/count`, { params: { filters: JSON.stringify(state.filters || []) } })
          state.totalCount = resp?.data?.count || 0
          return state.totalCount
        } catch (error) {
          console.error('Count error:', error);
          return 0;
        }
      },

      /**
       * Get total pages
       */
      getTotalPages: async () => {
        const count = await this.getTotalCount();
        return Math.ceil(count / pageSize);
      },

      /**
       * Clear pagination state
       */
      reset: () => {
        state.currentPage = 1;
        state.lastSnapshot = null;
        state.pages.clear();
        if (state.cacheKey) {
          analyticsCache.invalidate(`${state.cacheKey}:*`);
        }
      }
    };
  }

  /**
   * Batch multiple queries for efficiency
   * @param {Array<Object>} queryConfigs - Array of query configurations
   * @returns {Promise<Array>} Results of all queries
   */
  async batchQueries(queryConfigs) {
    try {
      const results = await Promise.all(
        queryConfigs.map(async (config) => {
          const { collectionName, filters = [], orderBy: orderByField = null, limit: limitValue = null } = config;
          
          // Check cache
          const cacheKey = `batch_${JSON.stringify(config)}`;
          const cached = analyticsCache.get(cacheKey);
          if (cached) {
            this.stats.cacheHits++;
            return cached;
          }

           // Use REST endpoint to perform the filtered/ordered/limited query
           const params = {
             filters: JSON.stringify(filters || []),
             orderBy: orderByField ? JSON.stringify(orderByField) : undefined,
             limit: limitValue || undefined
           };
           const resp = await axios.get(`${API_BASE}/api/${collectionName}`, { params });
           const data = resp?.data?.items || resp?.data?.data || resp?.data || [];
 
           analyticsCache.set(cacheKey, data, 300000);
          this.stats.cacheMisses++;
          this.stats.batchedQueries++;

          return data;
        })
      );

      return results;
    } catch (error) {
      console.error('Batch query error:', error);
      return [];
    }
  }

  /**
   * Get query cost estimation
   * @param {string} collectionName - Collection name
   * @param {Object} options - Query options
   * @returns {Object} Cost estimation
   */
  async estimateQueryCost(collectionName, options = {}) {
    try {
      const { filters = [], complexity = 'simple' } = options;

      // Simple read: 1 unit
      // Complex read (with filters): 1 unit per filter + 1
      // Very complex: depends on document size
      
      const filterCost = filters.length > 0 ? 1 + filters.length : 1;
      const complexityMultiplier = {
        simple: 1,
        moderate: 2,
        complex: 5
      };

      const estimatedCost = filterCost * (complexityMultiplier[complexity] || 1);
      
      // Get document count for reference
      const resp = await axios.get(`${API_BASE}/api/${collectionName}/count`, { params: { filters: JSON.stringify(filters || []) } });
      const docCount = resp?.data?.count || 0;

      return {
        operation: 'read',
        collection: collectionName,
        estimatedReadUnits: estimatedCost,
        estimatedDocuments: docCount,
        filters: filters.length,
        complexity
      };
    } catch (error) {
      console.error('Cost estimation error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get index recommendations
   * @param {string} collectionName - Collection name
   * @param {Object} queryPattern - Common query pattern
   * @returns {Object} Recommended indexes
   */
  getIndexRecommendations(collectionName, queryPattern = {}) {
    const { filters = [], orderBy: orderByField = null } = queryPattern;

    const recommendations = [];

    if (filters.length > 1 && orderByField) {
      recommendations.push({
        type: 'composite',
        fields: [...filters.map(f => f.field), orderByField],
        reason: 'Improve filtered + sorted queries'
      });
    }

    if (filters.length > 0) {
      recommendations.push({
        type: 'simple',
        fields: filters.map(f => f.field),
        reason: 'Improve filter performance'
      });
    }

    if (orderByField) {
      recommendations.push({
        type: 'simple',
        fields: [orderByField],
        reason: 'Improve sort performance'
      });
    }

    return {
      collection: collectionName,
      recommendations,
      deployedIndexes: this.getDeployedIndexes(collectionName)
    };
  }

  /**
   * Get deployed indexes for collection
   * @private
   */
  getDeployedIndexes(collectionName) {
    // In production, this would query Firestore REST API
    // For now, return common indexes
    return [
      { fields: ['created_at'], direction: 'desc' },
      { fields: ['updated_at'], direction: 'desc' },
      { fields: ['status'], direction: 'asc' }
    ];
  }

  /**
   * Generate Firestore composite index configuration
   * @param {Array<Object>} indexes - Index configurations
   * @returns {string} YAML configuration
   */
  generateIndexConfig(indexes) {
    let config = 'indexes:\n';

    indexes.forEach((index, idx) => {
      config += `  - collectionGroup: ${index.collection}\n`;
      config += `    queryScope: COLLECTION\n`;
      config += `    fields:\n`;
      
      index.fields.forEach(field => {
        config += `      - fieldPath: ${field}\n`;
        config += `        order: ASCENDING\n`;
      });
    });

    return config;
  }

  /**
   * Get query optimization statistics
   */
  getStats() {
    const hitRate = this.stats.totalQueries > 0
      ? ((this.stats.cacheHits / this.stats.totalQueries) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      batchedQueries: 0
    };
  }

  /**
   * Analyze query performance
   * @param {string} collectionName - Collection name
   * @returns {Object} Performance analysis
   */
  analyzeQueryPerformance(collectionName) {
    return {
      collection: collectionName,
      recommendations: [
        'Add indexes for frequently filtered fields',
        'Use pagination for large result sets',
        'Implement caching for repeated queries',
        'Batch related queries together',
        'Consider denormalizing frequent joins'
      ],
      estimatedMonthlyCost: '$0-5 (varies with document size)'
    };
  }
}

// Export singleton instance
export const queryOptimizer = new QueryOptimizationService();

export default queryOptimizer;
