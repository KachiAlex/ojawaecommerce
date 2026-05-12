# Flutterwave Webhook - Quick Reference

## 🔗 Webhook URL

```
https://us-central1-ojawa-ecommerce.cloudfunctions.net/flutterwaveWebhook
```

## ⚡ Quick Setup

### 1. Deploy Functions
```bash
firebase deploy --only functions
```

### 2. Set Environment Variables
```bash
firebase functions:config:set flutterwave.secret_key="YOUR_SECRET_KEY"
firebase functions:config:set flutterwave.secret_hash="YOUR_SECRET_HASH"
firebase deploy --only functions
```

### 3. Configure in Flutterwave Dashboard
- Go to: https://dashboard.flutterwave.com/settings/webhooks
- Add webhook URL: `https://us-central1-ojawa-ecommerce.cloudfunctions.net/flutterwaveWebhook`
- Select events: `charge.completed`, `charge.successful`, `charge.failed`

## 📋 Events Handled

| Event | Action |
|-------|--------|
| `charge.completed` | Process payment, credit wallet/update order |
| `charge.successful` | Process payment, credit wallet/update order |
| `charge.failed` | Log failure, notify user |

## 🔍 Check Logs

```bash
firebase functions:log --only flutterwaveWebhook
```

## 🧪 Test Cards

**Success:**
- Card: `5531886652142950`
- CVV: `123`
- Expiry: `12/32`
- PIN: `1234`

**Failure:**
- Card: `4084084084084081`
- CVV: `408`
- Expiry: `12/32`
- PIN: `4081`

## ✅ Verification

After setup, verify:
1. Webhook appears in Flutterwave dashboard
2. Test payment triggers webhook
3. Wallet/order updated in Firestore
4. User receives notification

---

For detailed setup, see: `FLUTTERWAVE_WEBHOOK_SETUP.md`

