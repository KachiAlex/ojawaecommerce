# Enhanced Notification System - Setup Guide

## Overview

The Enhanced Notification System adds push notifications via Firebase Cloud Messaging (FCM) and email notifications via Firebase Extensions to the Ojawa e-commerce platform.

## Features Implemented

### 1. Push Notifications (FCM)
- ✅ Browser push notifications for all major browsers
- ✅ Automatic FCM token management
- ✅ Foreground and background message handling
- ✅ Notification click handling with deep linking
- ✅ User notification preferences (per-category control)

### 2. Email Notifications
- ✅ Email delivery via Firebase Extensions
- ✅ Email templates for all notification types
- ✅ User email preferences (per-category control)
- ✅ Automatic email queuing

### 3. User Preferences
- ✅ Settings page in buyer and vendor dashboards
- ✅ Toggle push notifications on/off
- ✅ Toggle email notifications on/off
- ✅ Category-specific preferences (orders, payments, disputes, marketing)
- ✅ Test notification feature

### 4. Cloud Functions
- ✅ Push notification delivery on notification create
- ✅ Email notification delivery on notification create
- ✅ Bulk notification support
- ✅ User preference checking
- ✅ Invalid token cleanup

## Deployment Steps

### Step 1: Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

This will deploy:
- `sendPushNotification` - Triggered when a notification document is created
- `sendEmailNotification` - Triggered when a notification document is created (if sendEmail flag is true)
- `sendBulkPushNotifications` - Callable function for sending bulk notifications

### Step 2: Install Firebase Extension

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: `ojawa-ecommerce`
3. Navigate to **Extensions** in the left sidebar
4. Click **Install Extension**
5. Search for "Trigger Email from Firestore"
6. Click **Install** on the "Trigger Email from Firestore" extension
7. Configure the extension:
   - **Collection path**: `mail`
   - **Email field**: `to`
   - **Email subject field**: Leave default or customize
   - **Template field**: Leave default
8. Set up SMTP credentials:
   - You can use **Gmail SMTP**, **SendGrid**, **Mailgun**, or any SMTP provider
   - For Gmail:
     - SMTP Server: `smtp.gmail.com`
     - Port: `587`
     - Username: Your Gmail address
     - Password: App-specific password (generate from Google Account settings)
   - Or use Firebase's default SendGrid integration

### Step 3: Configure VAPID Key for FCM

1. Go to Firebase Console > Project Settings > Cloud Messaging
2. Under "Web Push certificates", find your VAPID key or generate a new one
3. Copy the VAPID key
4. Update `apps/buyer/src/services/fcmService.js` line 9:

```javascript
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';
```

### Step 4: Update Firestore Rules

```bash
firebase deploy --only firestore:rules
```

This updates the rules to allow the `mail` collection for the extension.

### Step 5: Build and Deploy Frontend

```bash
cd apps/buyer
npm run build
cd ../..
firebase deploy --only hosting
```

## Testing the System

### Test Push Notifications

1. Log in to the application
2. Navigate to Settings tab (in buyer or vendor dashboard)
3. Click "Enable Notifications" if not already enabled
4. Click "Send Test Notification"
5. You should see:
   - An in-app notification (if app is open)
   - A browser push notification
   - A notification in the notification bell icon

### Test Email Notifications

1. Ensure your user account has a valid email address
2. Enable email notifications in Settings
3. Perform an action that triggers a notification (e.g., place an order)
4. Check your email inbox for the notification email
5. Check Firebase Console > Extensions > Trigger Email > Logs to verify delivery

### Test User Preferences

1. Go to Settings tab
2. Disable specific categories (e.g., disable "Marketing" notifications)
3. Try to trigger a marketing notification - it should not be sent
4. Re-enable the category and verify notifications resume

## Notification Types Supported

### Buyer Notifications
- ✅ Order placed
- ✅ Payment processed
- ✅ Order shipped
- ✅ Order delivered
- ✅ Order completed
- ✅ Order cancelled
- ✅ Dispute created
- ✅ Dispute resolved

### Vendor Notifications
- ✅ New order received
- ✅ Payment released
- ✅ Dispute created
- ✅ Dispute resolved

### Logistics Notifications
- ✅ Delivery assigned
- ✅ Delivery status updates

## Troubleshooting

### Push Notifications Not Working

1. **Check browser permission**: Ensure notifications are allowed in browser settings
2. **Check FCM token**: Verify token is saved in user document in Firestore
3. **Check Cloud Function logs**: Go to Firebase Console > Functions > Logs
4. **Verify VAPID key**: Ensure correct VAPID key is set in fcmService.js

### Email Notifications Not Working

1. **Check Extension status**: Firebase Console > Extensions > Status
2. **Check mail collection**: Verify documents are being created in `mail` collection
3. **Check SMTP credentials**: Verify SMTP configuration in Extension settings
4. **Check Extension logs**: Firebase Console > Extensions > Trigger Email > Logs

### Invalid FCM Token Errors

- The system automatically removes invalid tokens
- Users will need to re-enable notifications after token expiration

## Architecture

```
User Action
    ↓
Notification Created (Firestore)
    ↓
    ├─→ sendPushNotification (Cloud Function)
    │       ↓
    │   Check user preferences
    │       ↓
    │   Send FCM message
    │       ↓
    │   User receives push notification
    │
    └─→ sendEmailNotification (Cloud Function)
            ↓
        Check user preferences
            ↓
        Create document in mail collection
            ↓
        Extension sends email
            ↓
        User receives email
```

## Files Modified/Created

### New Files
- `apps/buyer/src/services/fcmService.js` - FCM token management
- `apps/buyer/src/components/NotificationPreferences.jsx` - Preferences UI
- `NOTIFICATION_SYSTEM_SETUP.md` - This file

### Modified Files
- `functions/index.js` - Added notification Cloud Functions
- `apps/buyer/src/firebase/config.js` - Added messaging initialization
- `apps/buyer/src/contexts/MessagingContext.jsx` - Added FCM integration
- `apps/buyer/src/services/notificationService.js` - Enhanced with push/email methods
- `apps/buyer/src/pages/EnhancedBuyer.jsx` - Added Settings tab
- `apps/buyer/src/pages/Vendor.jsx` - Added Settings tab
- `firestore.rules` - Added mail collection rules

## Future Enhancements

- [ ] HTML email templates with branding
- [ ] Scheduled notifications
- [ ] Notification analytics dashboard
- [ ] SMS notifications integration
- [ ] WhatsApp notifications integration
- [ ] In-app notification center with filtering
- [ ] Notification sound customization
- [ ] Do Not Disturb hours

## Support

For issues or questions, check:
1. Firebase Console logs
2. Browser console for client-side errors
3. Cloud Function logs for server-side errors
4. Extension logs for email delivery issues

