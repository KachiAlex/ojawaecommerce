import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMessaging } from '../contexts/MessagingContext';
import firebaseService from '../services/firebaseService';

const NotificationPreferences = () => {
  const { currentUser } = useAuth();
  const { notificationPermission, requestNotificationPermission } = useMessaging();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    push: {
      enabled: true,
      orders: true,
      payments: true,
      disputes: true,
      marketing: false
    },
    email: {
      enabled: true,
      orders: true,
      payments: true,
      disputes: true,
      marketing: false
    }
  });

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!currentUser) return;

      try {
        const userDoc = await firebaseService.users.getById(currentUser.uid);
        if (userDoc?.notificationPreferences) {
          setPreferences(userDoc.notificationPreferences);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [currentUser]);

  // Save preferences to Firestore
  const savePreferences = async () => {
    if (!currentUser) return;

    try {
      setSaving(true);
      await firebaseService.users.update(currentUser.uid, {
        notificationPreferences: preferences
      });
      alert('Notification preferences saved successfully!');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle push toggle
  const handlePushToggle = async (enabled) => {
    if (enabled && notificationPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        alert('Please allow notifications in your browser settings');
        return;
      }
    }

    setPreferences(prev => ({
      ...prev,
      push: { ...prev.push, enabled }
    }));
  };

  // Test notification
  const sendTestNotification = async () => {
    try {
      await firebaseService.notifications.create({
        userId: currentUser.uid,
        type: 'general',
        title: 'Test Notification',
        message: 'This is a test notification from Ojawa!',
        sendEmail: false,
        read: false,
        createdAt: new Date()
      });
      alert('Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Failed to send test notification');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage how you receive notifications from Ojawa
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Permission Status */}
        {notificationPermission === 'denied' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Notifications are blocked
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>To enable notifications:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Click the lock icon in your browser's address bar</li>
                    <li>Select "Allow" for notifications</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Browser Notification Permission</h4>
              <p className="text-sm text-gray-600 mt-1">
                Status: 
                <span className={`ml-2 font-semibold ${
                  notificationPermission === 'granted' ? 'text-green-600' : 
                  notificationPermission === 'denied' ? 'text-red-600' : 
                  'text-yellow-600'
                }`}>
                  {notificationPermission === 'granted' ? 'Allowed' : 
                   notificationPermission === 'denied' ? 'Blocked' : 
                   'Not Set'}
                </span>
              </p>
              {notificationPermission !== 'granted' && (
                <button
                  onClick={async () => {
                    try {
                      setSaving(true);
                      const granted = await requestNotificationPermission();
                      if (granted) {
                        console.log('✅ Notification permission granted');
                      } else {
                        console.log('❌ Notification permission denied');
                        alert('Notification permission was denied. Please enable it in your browser settings.');
                      }
                    } catch (error) {
                      console.error('Error requesting notification permission:', error);
                      alert('Error requesting notification permission. Please try again.');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Requesting...' : 'Enable Notifications'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Push Notifications</h4>
              <p className="text-sm text-gray-600">Receive instant notifications in your browser</p>
            </div>
            <button
              onClick={() => handlePushToggle(!preferences.push.enabled)}
              disabled={notificationPermission === 'denied'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.push.enabled ? 'bg-blue-600' : 'bg-gray-300'
              } ${notificationPermission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.push.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {preferences.push.enabled && (
            <div className="ml-4 space-y-3 border-l-2 border-gray-200 pl-4">
              <PreferenceToggle
                label="Orders"
                description="New orders, status updates, and delivery notifications"
                checked={preferences.push.orders}
                onChange={(checked) => setPreferences(prev => ({
                  ...prev,
                  push: { ...prev.push, orders: checked }
                }))}
              />
              <PreferenceToggle
                label="Payments"
                description="Payment confirmations and wallet transactions"
                checked={preferences.push.payments}
                onChange={(checked) => setPreferences(prev => ({
                  ...prev,
                  push: { ...prev.push, payments: checked }
                }))}
              />
              <PreferenceToggle
                label="Disputes"
                description="Dispute updates and resolutions"
                checked={preferences.push.disputes}
                onChange={(checked) => setPreferences(prev => ({
                  ...prev,
                  push: { ...prev.push, disputes: checked }
                }))}
              />
              <PreferenceToggle
                label="Marketing"
                description="Promotions, offers, and product recommendations"
                checked={preferences.push.marketing}
                onChange={(checked) => setPreferences(prev => ({
                  ...prev,
                  push: { ...prev.push, marketing: checked }
                }))}
              />
            </div>
          )}
        </div>

        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Email Notifications</h4>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
            <button
              onClick={() => setPreferences(prev => ({
                ...prev,
                email: { ...prev.email, enabled: !prev.email.enabled }
              }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.email.enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.email.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {preferences.email.enabled && (
            <div className="ml-4 space-y-3 border-l-2 border-gray-200 pl-4">
              <PreferenceToggle
                label="Orders"
                description="New orders, status updates, and delivery notifications"
                checked={preferences.email.orders}
                onChange={(checked) => setPreferences(prev => ({
                  ...prev,
                  email: { ...prev.email, orders: checked }
                }))}
              />
              <PreferenceToggle
                label="Payments"
                description="Payment confirmations and wallet transactions"
                checked={preferences.email.payments}
                onChange={(checked) => setPreferences(prev => ({
                  ...prev,
                  email: { ...prev.email, payments: checked }
                }))}
              />
              <PreferenceToggle
                label="Disputes"
                description="Dispute updates and resolutions"
                checked={preferences.email.disputes}
                onChange={(checked) => setPreferences(prev => ({
                  ...prev,
                  email: { ...prev.email, disputes: checked }
                }))}
              />
              <PreferenceToggle
                label="Marketing"
                description="Promotions, offers, and product recommendations"
                checked={preferences.email.marketing}
                onChange={(checked) => setPreferences(prev => ({
                  ...prev,
                  email: { ...prev.email, marketing: checked }
                }))}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
          
          <button
            onClick={sendTestNotification}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Send Test Notification
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper component for preference toggles
const PreferenceToggle = ({ label, description, checked, onChange }) => {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export default NotificationPreferences;

