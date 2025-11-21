import { useState, useCallback } from 'react';
import logisticsPricingService from '../services/logisticsPricingService';

/**
 * Custom hook for logistics pricing calculations
 */
export const useLogisticsPricing = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  /**
   * Calculate delivery fee
   */
  const calculateDeliveryFee = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);
      
      const calculation = await logisticsPricingService.calculateDeliveryFee(params);
      
      if (calculation.success) {
        setResult(calculation);
        return calculation;
      } else {
        setError(calculation.error);
        return null;
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Calculate multiple delivery options across partners
   */
  const calculateDeliveryOptions = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);

      // Get partners for this route
      const partners = await logisticsPricingService.getAvailablePartners(params.pickup, params.dropoff);
      if (!partners || partners.length === 0) {
        setResult({ partners: [] });
        return { partners: [] };
      }

      // For each partner, compute standard pricing (and express when applicable)
      const partnerCalcs = await Promise.all(
        partners.map(async (p) => {
          const calc = await logisticsPricingService.calculateDeliveryFee({ ...params, partner: p.id, type: params.type || 'standard' });
          if (calc && calc.success) {
            return {
              partner: { id: p.id, name: p.name, rating: p.rating || 0 },
              deliveryFee: calc.deliveryFee,
              eta: calc.eta,
              estimatedDays: calc.eta?.match(/\d+/)?.[0] || '',
              distance: calc.distance,
              breakdown: calc.breakdown,
              type: params.type || 'standard'
            };
          }
          return null;
        })
      );

      const options = (partnerCalcs.filter(Boolean)).sort((a, b) => a.deliveryFee - b.deliveryFee);
      const res = { partners: options };
      setResult(res);
      return res;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get available logistics partners (raw list)
   */
  const getLogisticsPartners = useCallback(async (pickup, dropoff) => {
    try {
      return await logisticsPricingService.getAvailablePartners(pickup, dropoff);
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  /**
   * Get pricing configuration
   */
  const getPricingConfig = useCallback(() => {
    return logisticsPricingService.getPricingConfig();
  }, []);

  /**
   * Update pricing configuration
   */
  const updatePricingConfig = useCallback(async (config) => {
    try {
      setLoading(true);
      setError(null);
      
      await logisticsPricingService.updatePricingConfig(config);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear result state
   */
  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  /**
   * Reset all states
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    // State
    loading,
    error,
    result,
    
    // Actions
    calculateDeliveryFee,
    calculateDeliveryOptions,
    getLogisticsPartners,
    getPricingConfig,
    updatePricingConfig,
    
    // Utilities
    clearError,
    clearResult,
    reset
  };
};

export default useLogisticsPricing;
