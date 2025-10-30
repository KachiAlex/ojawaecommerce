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
   * Calculate multiple delivery options
   */
  const calculateDeliveryOptions = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);
      
      const [standard, express] = await Promise.all([
        logisticsPricingService.calculateDeliveryFee({ ...params, type: 'standard' }),
        logisticsPricingService.calculateDeliveryFee({ ...params, type: 'express' })
      ]);
      
      const options = {
        standard: standard.success ? standard : null,
        express: express.success ? express : null
      };
      
      setResult(options);
      return options;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get available logistics partners
   */
  const getLogisticsPartners = useCallback(async (zone) => {
    try {
      const partner = await logisticsPricingService.getLogisticsPartner(null, zone);
      return [partner];
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
