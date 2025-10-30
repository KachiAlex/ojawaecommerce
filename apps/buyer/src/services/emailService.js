// Email Notifications Service
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit as fsLimit } from 'firebase/firestore';
import { db } from '../firebase/config';

class EmailService {
  // Send email notification
  async sendEmail(notificationData) {
    try {
      const emailRecord = {
        ...notificationData,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'email_queue'), emailRecord);
      
      // Trigger email sending (this would be handled by a Cloud Function)
      await this.triggerEmailSending(docRef.id, emailRecord);
      
      return docRef.id;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // Trigger email sending (placeholder for Cloud Function)
  async triggerEmailSending(emailId, emailData) {
    try {
      // This would typically call a Cloud Function
      // For now, we'll just log the email data
      console.log('Email queued for sending:', {
        id: emailId,
        to: emailData.to,
        subject: emailData.subject,
        type: emailData.type
      });

      // In production, this would call:
      // await fetch('/api/send-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ emailId, emailData })
      // });
    } catch (error) {
      console.error('Error triggering email sending:', error);
    }
  }

  // Send subscription confirmation email
  async sendSubscriptionConfirmation(userEmail, userName, planName, amount) {
    const emailData = {
      to: userEmail,
      subject: `Welcome to ${planName} Plan - Ojawa`,
      type: 'subscription_confirmation',
      template: 'subscription_confirmation',
      data: {
        userName,
        planName,
        amount,
        features: this.getPlanFeatures(planName)
      }
    };

    return await this.sendEmail(emailData);
  }

  // Send subscription upgrade email
  async sendSubscriptionUpgrade(userEmail, userName, oldPlan, newPlan, amount) {
    const emailData = {
      to: userEmail,
      subject: `Subscription Upgraded to ${newPlan} Plan`,
      type: 'subscription_upgrade',
      template: 'subscription_upgrade',
      data: {
        userName,
        oldPlan,
        newPlan,
        amount
      }
    };

    return await this.sendEmail(emailData);
  }

  // Send usage limit warning email
  async sendUsageLimitWarning(userEmail, userName, limitType, currentUsage, limit) {
    const emailData = {
      to: userEmail,
      subject: `Usage Limit Warning - ${limitType}`,
      type: 'usage_limit_warning',
      template: 'usage_limit_warning',
      data: {
        userName,
        limitType,
        currentUsage,
        limit,
        percentage: Math.round((currentUsage / limit) * 100)
      }
    };

    return await this.sendEmail(emailData);
  }

  // Send payment confirmation email
  async sendPaymentConfirmation(userEmail, userName, amount, planName, transactionId) {
    const emailData = {
      to: userEmail,
      subject: `Payment Confirmation - ${planName} Plan`,
      type: 'payment_confirmation',
      template: 'payment_confirmation',
      data: {
        userName,
        amount,
        planName,
        transactionId,
        date: new Date().toLocaleDateString()
      }
    };

    return await this.sendEmail(emailData);
  }

  // Send order notification email
  async sendOrderNotification(vendorEmail, orderData) {
    const emailData = {
      to: vendorEmail,
      subject: `New Order #${orderData.id}`,
      type: 'order_notification',
      template: 'order_notification',
      data: {
        orderId: orderData.id,
        customerName: orderData.customerName,
        totalAmount: orderData.totalAmount,
        items: orderData.items,
        orderDate: orderData.createdAt
      }
    };

    return await this.sendEmail(emailData);
  }

  // Send dispute notification email
  async sendDisputeNotification(userEmail, disputeData) {
    const emailData = {
      to: userEmail,
      subject: `Dispute Created - Order #${disputeData.orderId}`,
      type: 'dispute_notification',
      template: 'dispute_notification',
      data: {
        disputeId: disputeData.id,
        orderId: disputeData.orderId,
        reason: disputeData.reason,
        status: disputeData.status
      }
    };

    return await this.sendEmail(emailData);
  }

  // Send analytics report email
  async sendAnalyticsReport(userEmail, userName, reportData) {
    const emailData = {
      to: userEmail,
      subject: `Weekly Analytics Report - ${userName}`,
      type: 'analytics_report',
      template: 'analytics_report',
      data: {
        userName,
        period: reportData.period,
        metrics: reportData.metrics,
        insights: reportData.insights
      }
    };

    return await this.sendEmail(emailData);
  }

  // Get plan features for email templates
  getPlanFeatures(planName) {
    const features = {
      basic: ['Up to 50 products', 'Basic analytics', 'Email support'],
      pro: ['Up to 500 products', 'Advanced analytics', 'Priority support', 'Featured listings'],
      premium: ['Unlimited products', 'Premium analytics', 'Dedicated support', 'API access']
    };
    return features[planName.toLowerCase()] || [];
  }

  // Get email history for user
  async getEmailHistory(userId, limit = 50) {
    try {
      const q = query(
        collection(db, 'email_queue'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        fsLimit(limit)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching email history:', error);
      return [];
    }
  }

  // Update email status
  async updateEmailStatus(emailId, status, error = null) {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const emailRef = doc(db, 'email_queue', emailId);
      
      await updateDoc(emailRef, {
        status,
        error: error || null,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating email status:', error);
    }
  }
}

export default new EmailService();
