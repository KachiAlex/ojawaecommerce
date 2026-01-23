/**
 * Promotional Campaign Service
 * Handles campaign creation, vendor participation, and discount application
 */

import { collection, doc, getDocs, query, where, addDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

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
   * Create a new promotional campaign
   */
  async createCampaign(campaignData) {
    try {
      const campaign = {
        ...campaignData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: campaignData.status || CAMPAIGN_STATUS.DRAFT,
        participationCount: 0,
        totalProducts: 0,
        totalDiscountValue: 0
      };

      const docRef = await addDoc(collection(db, 'promoCampaigns'), campaign);
      return docRef.id;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  },

  /**
   * Update a campaign
   */
  async updateCampaign(campaignId, updates) {
    try {
      const campaignRef = doc(db, 'promoCampaigns', campaignId);
      await updateDoc(campaignRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return campaignId;
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  },

  /**
   * Get all campaigns (with optional filters)
   */
  async getCampaigns(filters = {}) {
    try {
      let q = collection(db, 'promoCampaigns');
      
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      if (filters.type) {
        q = query(q, where('type', '==', filters.type));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  },

  /**
   * Get active campaigns
   */
  async getActiveCampaigns() {
    try {
      // Get all campaigns with active status (Firestore doesn't support multiple where clauses with date comparisons)
      const q = query(
        collection(db, 'promoCampaigns'),
        where('status', '==', CAMPAIGN_STATUS.ACTIVE)
      );

      const snapshot = await getDocs(q);
      const now = new Date();
      
      // Filter by date in JavaScript
      return snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(campaign => {
          const startDate = campaign.startDate?.toDate?.() || new Date(campaign.startDate);
          const endDate = campaign.endDate?.toDate?.() || new Date(campaign.endDate);
          return startDate <= now && endDate >= now;
        });
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      return [];
    }
  },

  /**
   * Get campaign by ID
   */
  async getCampaignById(campaignId) {
    try {
      const docRef = doc(db, 'promoCampaigns', campaignId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
  },

  /**
   * Add vendor participation to campaign
   */
  async addVendorParticipation(campaignId, vendorId, participationData = {}) {
    try {
      const participation = {
        campaignId,
        vendorId,
        status: 'active',
        productsCount: 0,
        totalDiscount: 0,
        optedInAt: serverTimestamp(),
        ...participationData
      };

      const docRef = await addDoc(collection(db, 'promoCampaignParticipations'), participation);
      
      // Update campaign participation count
      const campaignRef = doc(db, 'promoCampaigns', campaignId);
      const campaignSnap = await getDoc(campaignRef);
      if (campaignSnap.exists()) {
        const currentCount = campaignSnap.data().participationCount || 0;
        await updateDoc(campaignRef, {
          participationCount: currentCount + 1,
          updatedAt: serverTimestamp()
        });
      }

      return docRef.id;
    } catch (error) {
      console.error('Error adding vendor participation:', error);
      throw error;
    }
  },

  /**
   * Get vendor participation in a campaign
   */
  async getVendorParticipation(campaignId, vendorId) {
    try {
      const q = query(
        collection(db, 'promoCampaignParticipations'),
        where('campaignId', '==', campaignId),
        where('vendorId', '==', vendorId)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error fetching vendor participation:', error);
      return null;
    }
  },

  /**
   * Get all participating vendors for a campaign
   */
  async getCampaignVendors(campaignId) {
    try {
      const q = query(
        collection(db, 'promoCampaignParticipations'),
        where('campaignId', '==', campaignId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching campaign vendors:', error);
      return [];
    }
  },

  /**
   * Apply campaign discount to a product
   */
  async applyCampaignToProduct(campaignId, productId, discountConfig) {
    try {
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) {
        throw new Error('Product not found');
      }

      const product = productSnap.data();
      // Use originalPrice if it exists (to preserve true original), otherwise use current price
      const basePrice = product.originalPrice || product.price || 0;
      const currentPrice = product.price || 0;
      
      // Calculate discount based on base price
      let discountAmount = 0;
      let discountedPrice = currentPrice;

      if (discountConfig.type === 'percentage') {
        discountAmount = (basePrice * discountConfig.value) / 100;
        discountedPrice = basePrice - discountAmount;
      } else if (discountConfig.type === 'fixed') {
        discountAmount = discountConfig.value;
        discountedPrice = Math.max(0, basePrice - discountAmount);
      }

      // Preserve existing promoCampaigns and add new one
      const existingPromos = product.promoCampaigns || {};
      const updatedPromos = {
        ...existingPromos,
        [campaignId]: {
          discountType: discountConfig.type,
          discountValue: discountConfig.value,
          discountAmount,
          appliedAt: serverTimestamp()
        }
      };

      // Update product with promo pricing
      await updateDoc(productRef, {
        originalPrice: basePrice, // Always preserve the original price
        price: discountedPrice,
        promoCampaigns: updatedPromos,
        onSale: true,
        updatedAt: serverTimestamp()
      });

      return { discountAmount, discountedPrice };
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
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) {
        throw new Error('Product not found');
      }

      const product = productSnap.data();
      const originalPrice = product.originalPrice || product.price;

      // Remove this campaign from promoCampaigns
      const promoCampaigns = { ...(product.promoCampaigns || {}) };
      delete promoCampaigns[campaignId];

      // If no more campaigns, restore original price; otherwise keep current price
      const hasOtherCampaigns = Object.keys(promoCampaigns).length > 0;
      
      const updates = {
        promoCampaigns: hasOtherCampaigns ? promoCampaigns : {},
        onSale: hasOtherCampaigns,
        updatedAt: serverTimestamp()
      };

      // Only restore original price if no other campaigns exist
      if (!hasOtherCampaigns && originalPrice) {
        updates.price = originalPrice;
        updates.originalPrice = null; // Clear originalPrice if no campaigns
      }

      await updateDoc(productRef, updates);
    } catch (error) {
      console.error('Error removing campaign from product:', error);
      throw error;
    }
  },

  /**
   * Get vendor compliance statistics
   */
  async getVendorCompliance(campaignId) {
    try {
      const campaign = await this.getCampaignById(campaignId);
      if (!campaign) return null;

      const participants = await this.getCampaignVendors(campaignId);
      
      // Get all vendors (for required campaigns)
      let allVendors = [];
      if (campaign.participationType === VENDOR_PARTICIPATION.REQUIRED) {
        const vendorsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'vendor'),
          where('vendorApproved', '==', true)
        );
        const vendorsSnapshot = await getDocs(vendorsQuery);
        allVendors = vendorsSnapshot.docs.map(doc => doc.id);
      }

      const participantIds = participants.map(p => p.vendorId);
      const nonParticipants = allVendors.filter(id => !participantIds.includes(id));

      return {
        campaignId,
        totalVendors: allVendors.length || participants.length,
        participatingVendors: participants.length,
        nonParticipatingVendors: nonParticipants.length,
        complianceRate: allVendors.length > 0 
          ? (participants.length / allVendors.length) * 100 
          : 100,
        participants,
        nonParticipants
      };
    } catch (error) {
      console.error('Error getting vendor compliance:', error);
      throw error;
    }
  },

  /**
   * Notify vendors about campaign (required or opt-in)
   */
  async notifyVendors(campaignId, notificationType = 'invitation') {
    try {
      const campaign = await this.getCampaignById(campaignId);
      if (!campaign) throw new Error('Campaign not found');

      let vendorIds = [];

      if (campaign.participationType === VENDOR_PARTICIPATION.REQUIRED) {
        // Get all approved vendors
        const vendorsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'vendor'),
          where('vendorApproved', '==', true)
        );
        const vendorsSnapshot = await getDocs(vendorsQuery);
        vendorIds = vendorsSnapshot.docs.map(doc => doc.id);
      } else if (campaign.participationType === VENDOR_PARTICIPATION.INVITED) {
        // Get invited vendors
        vendorIds = campaign.invitedVendors || [];
      }

      // Create notifications for each vendor
      const notifications = vendorIds.map(vendorId => ({
        userId: vendorId,
        type: 'promotion',
        title: `🎉 ${campaign.name} - ${notificationType === 'invitation' ? 'Join Now!' : 'Campaign Started!'}`,
        message: campaign.description || `Don't miss out on ${campaign.name}. Apply discounts to your products now!`,
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
