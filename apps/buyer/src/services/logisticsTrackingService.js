import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ===============================
// LOGISTICS TRACKING CONSTANTS
// ===============================

export const DELIVERY_STAGES = {
  ORDER_CONFIRMED: 'order_confirmed',
  VENDOR_NOTIFIED: 'vendor_notified',
  PACKAGE_PREPARED: 'package_prepared',
  PICKUP_SCHEDULED: 'pickup_scheduled',
  PICKUP_IN_PROGRESS: 'pickup_in_progress',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  AT_DISTRIBUTION_CENTER: 'at_distribution_center',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERY_ATTEMPTED: 'delivery_attempted',
  DELIVERED: 'delivered',
  DELIVERY_FAILED: 'delivery_failed',
  RETURNED_TO_VENDOR: 'returned_to_vendor',
  CANCELLED: 'cancelled'
};

export const DELIVERY_STAGE_DETAILS = {
  [DELIVERY_STAGES.ORDER_CONFIRMED]: {
    name: 'Order Confirmed',
    description: 'Order has been confirmed and payment processed',
    icon: '📋',
    color: 'blue',
    estimatedDuration: '0 hours'
  },
  [DELIVERY_STAGES.VENDOR_NOTIFIED]: {
    name: 'Vendor Notified',
    description: 'Vendor has been notified to prepare the package',
    icon: '📢',
    color: 'blue',
    estimatedDuration: '1 hour'
  },
  [DELIVERY_STAGES.PACKAGE_PREPARED]: {
    name: 'Package Prepared',
    description: 'Vendor has prepared and packaged the item',
    icon: '📦',
    color: 'blue',
    estimatedDuration: '2-4 hours'
  },
  [DELIVERY_STAGES.PICKUP_SCHEDULED]: {
    name: 'Pickup Scheduled',
    description: 'Pickup has been scheduled with logistics partner',
    icon: '📅',
    color: 'yellow',
    estimatedDuration: '4-8 hours'
  },
  [DELIVERY_STAGES.PICKUP_IN_PROGRESS]: {
    name: 'Pickup In Progress',
    description: 'Logistics partner is on the way to pick up the package',
    icon: '🚛',
    color: 'orange',
    estimatedDuration: '1-2 hours'
  },
  [DELIVERY_STAGES.PICKED_UP]: {
    name: 'Picked Up',
    description: 'Package has been successfully picked up from vendor',
    icon: '✅',
    color: 'green',
    estimatedDuration: '0 hours'
  },
  [DELIVERY_STAGES.IN_TRANSIT]: {
    name: 'In Transit',
    description: 'Package is on its way to the destination',
    icon: '🚚',
    color: 'blue',
    estimatedDuration: '12-48 hours'
  },
  [DELIVERY_STAGES.AT_DISTRIBUTION_CENTER]: {
    name: 'At Distribution Center',
    description: 'Package has arrived at the local distribution center',
    icon: '🏢',
    color: 'blue',
    estimatedDuration: '2-4 hours'
  },
  [DELIVERY_STAGES.OUT_FOR_DELIVERY]: {
    name: 'Out for Delivery',
    description: 'Package is out for final delivery to customer',
    icon: '🏃‍♂️',
    color: 'orange',
    estimatedDuration: '2-6 hours'
  },
  [DELIVERY_STAGES.DELIVERY_ATTEMPTED]: {
    name: 'Delivery Attempted',
    description: 'Delivery attempt was made but unsuccessful',
    icon: '⚠️',
    color: 'yellow',
    estimatedDuration: '24 hours'
  },
  [DELIVERY_STAGES.DELIVERED]: {
    name: 'Delivered',
    description: 'Package has been successfully delivered',
    icon: '🎉',
    color: 'green',
    estimatedDuration: '0 hours'
  },
  [DELIVERY_STAGES.DELIVERY_FAILED]: {
    name: 'Delivery Failed',
    description: 'Delivery could not be completed',
    icon: '❌',
    color: 'red',
    estimatedDuration: '24-48 hours'
  },
  [DELIVERY_STAGES.RETURNED_TO_VENDOR]: {
    name: 'Returned to Vendor',
    description: 'Package has been returned to the vendor',
    icon: '↩️',
    color: 'red',
    estimatedDuration: '48-72 hours'
  },
  [DELIVERY_STAGES.CANCELLED]: {
    name: 'Cancelled',
    description: 'Delivery has been cancelled',
    icon: '🚫',
    color: 'red',
    estimatedDuration: '0 hours'
  }
};

// ===============================
// LOGISTICS TRACKING SERVICE
// ===============================

export const logisticsTrackingService = {
  // Create a new delivery tracking record
  async createDeliveryTracking(orderId, logisticsData) {
    try {
      const trackingData = {
        orderId,
        trackingNumber: this.generateTrackingNumber(),
        logisticsPartnerId: logisticsData.logisticsPartnerId,
        logisticsPartnerName: logisticsData.logisticsPartnerName,
        currentStage: DELIVERY_STAGES.ORDER_CONFIRMED,
        estimatedDeliveryDate: logisticsData.estimatedDeliveryDate,
        pickupLocation: logisticsData.pickupLocation,
        deliveryLocation: logisticsData.deliveryLocation,
        packageDetails: logisticsData.packageDetails,
        customerInfo: logisticsData.customerInfo,
        vendorInfo: logisticsData.vendorInfo,
        specialInstructions: logisticsData.specialInstructions || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Tracking history
        trackingHistory: [{
          stage: DELIVERY_STAGES.ORDER_CONFIRMED,
          timestamp: serverTimestamp(),
          location: logisticsData.pickupLocation,
          description: 'Order confirmed and tracking initiated',
          updatedBy: 'system'
        }],
        // Status flags
        isActive: true,
        requiresSignature: logisticsData.requiresSignature || false,
        isFragile: logisticsData.isFragile || false,
        isHighValue: logisticsData.isHighValue || false
      };

      const docRef = await addDoc(collection(db, 'delivery_tracking'), trackingData);
      
      return { id: docRef.id, ...trackingData };
    } catch (error) {
      console.error('Error creating delivery tracking:', error);
      throw error;
    }
  },

  // Update delivery stage with detailed tracking information
  async updateDeliveryStage(trackingId, stage, updateData = {}) {
    try {
      const trackingRef = doc(db, 'delivery_tracking', trackingId);
      const trackingSnap = await getDoc(trackingRef);
      
      if (!trackingSnap.exists()) {
        throw new Error('Tracking record not found');
      }

      const currentTracking = trackingSnap.data();
      
      // Validate stage progression
      if (!this.isValidStageProgression(currentTracking.currentStage, stage)) {
        throw new Error(`Invalid stage progression from ${currentTracking.currentStage} to ${stage}`);
      }

      const stageUpdate = {
        stage,
        timestamp: serverTimestamp(),
        location: updateData.location || currentTracking.currentLocation || 'Unknown',
        description: updateData.description || DELIVERY_STAGE_DETAILS[stage]?.description || '',
        updatedBy: updateData.updatedBy || 'logistics_partner',
        additionalInfo: updateData.additionalInfo || {}
      };

      // Prepare update data
      const updatePayload = {
        currentStage: stage,
        updatedAt: serverTimestamp(),
        trackingHistory: arrayUnion(stageUpdate)
      };

      // Add location if provided
      if (updateData.location) {
        updatePayload.currentLocation = updateData.location;
      }

      // Add estimated delivery update if provided
      if (updateData.estimatedDeliveryDate) {
        updatePayload.estimatedDeliveryDate = updateData.estimatedDeliveryDate;
      }

      // Add delivery notes if provided
      if (updateData.deliveryNotes) {
        updatePayload.deliveryNotes = updateData.deliveryNotes;
      }

      // Add delivery proof if provided
      if (updateData.deliveryProof) {
        updatePayload.deliveryProof = updateData.deliveryProof;
      }

      await updateDoc(trackingRef, updatePayload);

      // Send notifications if needed
      await this.sendStageNotifications(trackingId, stage, currentTracking);

      return { success: true, newStage: stage, trackingId };
    } catch (error) {
      console.error('Error updating delivery stage:', error);
      throw error;
    }
  },

  // Get tracking information by tracking number
  async getTrackingByNumber(trackingNumber) {
    try {
      const q = query(
        collection(db, 'delivery_tracking'),
        where('trackingNumber', '==', trackingNumber)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const trackingDoc = snapshot.docs[0];
        return { id: trackingDoc.id, ...trackingDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching tracking by number:', error);
      throw error;
    }
  },

  // Get tracking information by order ID
  async getTrackingByOrderId(orderId) {
    try {
      const q = query(
        collection(db, 'delivery_tracking'),
        where('orderId', '==', orderId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const trackingDoc = snapshot.docs[0];
        return { id: trackingDoc.id, ...trackingDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching tracking by order ID:', error);
      throw error;
    }
  },

  // Get all deliveries for a logistics partner
  async getDeliveriesByLogisticsPartner(partnerId, status = 'active') {
    try {
      let q = query(
        collection(db, 'delivery_tracking'),
        where('logisticsPartnerId', '==', partnerId),
        orderBy('updatedAt', 'desc')
      );

      if (status === 'active') {
        q = query(q, where('isActive', '==', true));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching deliveries by logistics partner:', error);
      throw error;
    }
  },

  // Add location update (for real-time tracking)
  async addLocationUpdate(trackingId, locationData) {
    try {
      const trackingRef = doc(db, 'delivery_tracking', trackingId);
      
      const locationUpdate = {
        timestamp: serverTimestamp(),
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address,
        accuracy: locationData.accuracy || null,
        updatedBy: locationData.updatedBy || 'driver'
      };

      await updateDoc(trackingRef, {
        currentLocation: locationData.address,
        locationHistory: arrayUnion(locationUpdate),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error adding location update:', error);
      throw error;
    }
  },

  // Add delivery attempt
  async addDeliveryAttempt(trackingId, attemptData) {
    try {
      const trackingRef = doc(db, 'delivery_tracking', trackingId);
      
      const attempt = {
        attemptNumber: attemptData.attemptNumber,
        timestamp: serverTimestamp(),
        location: attemptData.location,
        reason: attemptData.reason || 'Customer not available',
        notes: attemptData.notes || '',
        nextAttemptDate: attemptData.nextAttemptDate || null,
        updatedBy: attemptData.updatedBy || 'driver'
      };

      await updateDoc(trackingRef, {
        deliveryAttempts: arrayUnion(attempt),
        currentStage: DELIVERY_STAGES.DELIVERY_ATTEMPTED,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error adding delivery attempt:', error);
      throw error;
    }
  },

  // Complete delivery with proof
  async completeDelivery(trackingId, deliveryData) {
    try {
      const trackingRef = doc(db, 'delivery_tracking', trackingId);
      
      const deliveryCompletion = {
        timestamp: serverTimestamp(),
        deliveredTo: deliveryData.deliveredTo || 'Customer',
        signature: deliveryData.signature || null,
        photo: deliveryData.photo || null,
        notes: deliveryData.notes || '',
        updatedBy: deliveryData.updatedBy || 'driver'
      };

      await updateDoc(trackingRef, {
        currentStage: DELIVERY_STAGES.DELIVERED,
        deliveryCompletion,
        actualDeliveryDate: serverTimestamp(),
        isActive: false,
        updatedAt: serverTimestamp()
      });

      // Send delivery confirmation notifications
      await this.sendDeliveryConfirmation(trackingId);

      return { success: true };
    } catch (error) {
      console.error('Error completing delivery:', error);
      throw error;
    }
  },

  // Generate unique tracking number
  generateTrackingNumber() {
    const year = new Date().getFullYear();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TRK-${year}-${randomStr}`;
  },

  // Validate stage progression
  isValidStageProgression(currentStage, newStage) {
    const stageOrder = Object.values(DELIVERY_STAGES);
    const currentIndex = stageOrder.indexOf(currentStage);
    const newIndex = stageOrder.indexOf(newStage);
    
    // Allow progression forward or staying at same stage
    return newIndex >= currentIndex;
  },

  // Send stage notifications
  async sendStageNotifications(trackingId, stage, trackingData) {
    try {
      // This would integrate with your notification service
      // For now, we'll just log the notification
      console.log(`Sending notification for stage ${stage} for tracking ${trackingId}`);
      
      // You can implement actual notifications here:
      // - Email notifications to customer
      // - SMS updates
      // - Push notifications
      // - In-app notifications
      
      return { success: true };
    } catch (error) {
      console.error('Error sending stage notifications:', error);
      // Don't throw error to avoid breaking the main flow
    }
  },

  // Send delivery confirmation
  async sendDeliveryConfirmation(trackingId) {
    try {
      console.log(`Sending delivery confirmation for tracking ${trackingId}`);
      
      // Implement delivery confirmation notifications:
      // - Email confirmation to customer
      // - SMS delivery confirmation
      // - Push notification
      // - Update order status in main system
      
      return { success: true };
    } catch (error) {
      console.error('Error sending delivery confirmation:', error);
    }
  },

  // Get delivery statistics for logistics partner
  async getDeliveryStatistics(partnerId, dateRange = null) {
    try {
      let q = query(
        collection(db, 'delivery_tracking'),
        where('logisticsPartnerId', '==', partnerId)
      );

      const snapshot = await getDocs(q);
      const deliveries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const stats = {
        total: deliveries.length,
        completed: deliveries.filter(d => d.currentStage === DELIVERY_STAGES.DELIVERED).length,
        inTransit: deliveries.filter(d => [
          DELIVERY_STAGES.IN_TRANSIT,
          DELIVERY_STAGES.AT_DISTRIBUTION_CENTER,
          DELIVERY_STAGES.OUT_FOR_DELIVERY
        ].includes(d.currentStage)).length,
        pending: deliveries.filter(d => [
          DELIVERY_STAGES.ORDER_CONFIRMED,
          DELIVERY_STAGES.VENDOR_NOTIFIED,
          DELIVERY_STAGES.PACKAGE_PREPARED,
          DELIVERY_STAGES.PICKUP_SCHEDULED
        ].includes(d.currentStage)).length,
        failed: deliveries.filter(d => [
          DELIVERY_STAGES.DELIVERY_FAILED,
          DELIVERY_STAGES.RETURNED_TO_VENDOR
        ].includes(d.currentStage)).length,
        averageDeliveryTime: 0 // Calculate based on actual delivery times
      };

      return stats;
    } catch (error) {
      console.error('Error getting delivery statistics:', error);
      throw error;
    }
  },

  // Update estimated delivery time
  async updateEstimatedDelivery(trackingId, newEstimatedDate, reason = '') {
    try {
      const trackingRef = doc(db, 'delivery_tracking', trackingId);
      
      await updateDoc(trackingRef, {
        estimatedDeliveryDate: newEstimatedDate,
        estimatedDeliveryUpdate: {
          timestamp: serverTimestamp(),
          newDate: newEstimatedDate,
          reason,
          updatedBy: 'logistics_partner'
        },
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating estimated delivery:', error);
      throw error;
    }
  }
};

export default {
  logisticsTrackingService,
  DELIVERY_STAGES,
  DELIVERY_STAGE_DETAILS
};
