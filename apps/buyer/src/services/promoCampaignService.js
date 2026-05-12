/**
 * Promotional Campaign Service
 * Handles campaign creation, vendor participation, and discount application
 */

import { apiPost } from '../utils/apiClient';

export const CAMPAIGN_TYPES = {
  BLACK_FRIDAY: 'black_friday',
  FLASH_SALE: 'flash_sale',
  HOLIDAY_SALE: 'holiday_sale',
  SEASONAL: 'seasonal',
  CUSTOM: 'custom'
};

export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const VENDOR_PARTICIPATION = {
  REQUIRED: 'required', // All vendors must participate
  OPT_IN: 'opt_in', // Vendors can choose to participate
  INVITED: 'invited' // Only invited vendors can participate
};

export const promoCampaignService = {
  /**
   * Create a new promotional campaign (REST)
   */
  async createCampaign(campaignData) {
    try {
      const res = await apiPost('/api/admin/promo-campaigns/create', campaignData);
      return res.id;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  },

  /**
   * Update a campaign (REST)
   */
  async updateCampaign(campaignId, updates) {
    try {
      await apiPost(`/api/admin/promo-campaigns/${campaignId}/update`, updates);
      /**
       * Notify vendors about campaign (REST)
       */
      async notifyVendors(campaignId, notificationType = 'invitation') {
        try {
          const res = await apiPost(`/api/admin/promo-campaigns/${campaignId}/notify-vendors`, { notificationType });
          return res;
        } catch (error) {
          console.error('Error notifying vendors:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error adding vendor participation:', error);
      throw error;
    }
  },

  /**
   * Get vendor participation in a campaign (REST)
   */
  async getVendorParticipation(campaignId, vendorId) {
    try {
      const res = await apiPost(`/api/admin/promo-campaigns/${campaignId}/vendor-participation`, { vendorId });
      return res.participation || null;
    } catch (error) {
      console.error('Error fetching vendor participation:', error);
      return null;
    }
  },

  /**
   * Get all participating vendors for a campaign (REST)
   */
  async getCampaignVendors(campaignId) {
    try {
      const res = await apiPost(`/api/admin/promo-campaigns/${campaignId}/vendors`, {});
      return res.vendors || [];
    } catch (error) {
      console.error('Error fetching campaign vendors:', error);
      return [];
    }
  },

  /**
   * Apply campaign discount to a product (REST)
   */
  async applyCampaignToProduct(campaignId, productId, discountConfig) {
    try {
      const res = await apiPost(`/api/admin/promo-campaigns/${campaignId}/apply-to-product`, { productId, discountConfig });
      return res;
    } catch (error) {
      console.error('Error applying campaign to product:', error);
      throw error;
    }
  },

  /**
   * Remove campaign from product
   */
  async removeCampaignFromProduct(productId, campaignId) {
    try {
      // Delegate removal to backend
      await apiPost(`/api/admin/promo-campaigns/${campaignId}/remove-from-product`, { productId });
      return true;
    } catch (error) {
      console.error('Error removing campaign from product:', error);
      throw error;
    }
  },

  /**
   * Get vendor compliance statistics (REST)
   */
  async getVendorCompliance(campaignId) {
    try {
      const res = await apiPost(`/api/admin/promo-campaigns/${campaignId}/compliance`, {});
      return res.compliance || null;
    } catch (error) {
      console.error('Error getting vendor compliance:', error);
      throw error;
    }
  },
            throw error;
          }
        },
        data: {
          campaignId,
          campaignType: campaign.type,
          actionUrl: `/vendor/promotions/${campaignId}`
        },
        read: false,
        createdAt: serverTimestamp()
      }));

      // Batch create notifications (Firestore allows up to 500 operations per batch)
      const batchSize = 500;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const batchPromises = batch.map(notif => addDoc(collection(db, 'notifications'), notif));
        await Promise.all(batchPromises);
      }

      return { notifiedVendors: vendorIds.length };
    } catch (error) {
      console.error('Error notifying vendors:', error);
      throw error;
    }
  }
};

export default promoCampaignService;
