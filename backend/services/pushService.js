const webpush = require('web-push');
const { User } = require('../models');

let vapidConfigured = false;

const configureVapid = () => {
  if (vapidConfigured) return;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@ojawa.com';

  if (!publicKey || !privateKey) {
    console.warn('⚠️ VAPID keys not configured - push notifications will be skipped');
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  console.log('✅ VAPID keys configured for web push');
};

const sendPushToUser = async (userId, payload) => {
  configureVapid();
  if (!vapidConfigured) return { sent: false, reason: 'VAPID not configured' };

  try {
    const user = await User.findByPk(userId);
    if (!user) return { sent: false, reason: 'User not found' };

    const subscriptions = user.pushSubscriptions || [];
    if (!subscriptions.length) return { sent: false, reason: 'No subscriptions' };

    const payloadString = JSON.stringify({
      title: payload.title || 'Ojawa',
      body: payload.message || payload.body || '',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: payload.type || 'general',
      data: payload.data || { url: '/' }
    });

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(sub, payloadString)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Remove expired subscriptions
    if (failed > 0) {
      const validSubs = subscriptions.filter((sub, i) => {
        if (results[i].status === 'rejected') {
          const err = results[i].reason;
          // 404/410 means subscription is no longer valid
          if (err && (err.statusCode === 404 || err.statusCode === 410)) {
            return false;
          }
        }
        return true;
      });

      if (validSubs.length !== subscriptions.length) {
        await user.update({ pushSubscriptions: validSubs });
        console.log(`🧹 Removed ${subscriptions.length - validSubs.length} expired push subscriptions for user ${userId}`);
      }
    }

    console.log(`📱 Push sent to ${userId}: ${successful} success, ${failed} failed`);
    return { sent: successful > 0, successful, failed };
  } catch (error) {
    console.error('Push send failed:', error.message);
    return { sent: false, reason: error.message };
  }
};

const generateVapidKeys = () => {
  return webpush.generateVAPIDKeys();
};

module.exports = { sendPushToUser, configureVapid, generateVapidKeys };
