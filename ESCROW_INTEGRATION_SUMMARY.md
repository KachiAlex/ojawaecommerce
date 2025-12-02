# Escrow Integration Summary - Banking Partner API

## Quick Overview

This document provides a simplified one-page summary of how Ojawa communicates with the banking partner for escrow management.

---

## Communication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OJAWA ESCROW INTEGRATION                         │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   OJAWA      │
                    │  PLATFORM    │
                    └──────┬───────┘
                           │
                           │ HTTPS REST API
                           │ (JSON)
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  CREATE      │  │   RELEASE    │  │   REFUND     │
│  ESCROW HOLD │  │  ESCROW TO   │  │  ESCROW TO   │
│              │  │   VENDOR     │  │    BUYER     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       └─────────────────┼──────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  BANKING PARTNER API │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   ESCROW ACCOUNT     │
              │   (BANK-MANAGED)     │
              └──────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  WEBHOOK NOTIFICATIONS│
              │  (Status Updates)    │
              └──────────────────────┘
                         │
                         └───────────▶ OJAWA WEBHOOK HANDLER
```

---

## Key API Endpoints

| # | Operation | Banking Partner Endpoint | Method | When Called |
|---|-----------|-------------------------|--------|-------------|
| 1 | **Create Escrow** | `/api/v1/escrow/hold` | POST | Buyer completes checkout |
| 2 | **Release Escrow** | `/api/v1/escrow/release` | POST | Buyer confirms delivery |
| 3 | **Refund Escrow** | `/api/v1/escrow/refund` | POST | Admin resolves dispute |
| 4 | **Query Status** | `/api/v1/escrow/{escrowId}` | GET | Check escrow status |
| 5 | **Webhooks** | `POST /api/webhooks/escrow` | POST | Banking partner → Ojawa |

---

## 1. Create Escrow Hold (Order Creation)

**Ojawa → Banking Partner**
```
POST /api/v1/escrow/hold
Authorization: Bearer {api_key}

Request:
{
  "orderId": "ORD-2024-001234",
  "buyerId": "user_buyer_abc123",
  "vendorId": "user_vendor_xyz789",
  "amount": 5000.00,
  "currency": "NGN"
}

Response:
{
  "success": true,
  "escrowId": "ESC-2024-001234-567890",
  "status": "held",
  "amount": 5000.00
}
```

---

## 2. Release Escrow (Order Completion)

**Ojawa → Banking Partner**
```
POST /api/v1/escrow/release
Authorization: Bearer {api_key}

Request:
{
  "escrowId": "ESC-2024-001234-567890",
  "vendorId": "user_vendor_xyz789",
  "amount": 5000.00
}

Response:
{
  "success": true,
  "transactionId": "TXN-2024-001234-RELEASE-789",
  "status": "released"
}
```

---

## 3. Refund Escrow (Dispute Resolution)

**Ojawa → Banking Partner**
```
POST /api/v1/escrow/refund
Authorization: Bearer {api_key}

Request:
{
  "escrowId": "ESC-2024-001234-567890",
  "buyerId": "user_buyer_abc123",
  "amount": 5000.00,
  "reason": "Dispute resolved in favor of buyer"
}

Response:
{
  "success": true,
  "transactionId": "TXN-2024-001234-REFUND-456",
  "status": "refunded"
}
```

---

## 4. Webhook Notifications (Banking Partner → Ojawa)

**Banking Partner → Ojawa**
```
POST /api/webhooks/escrow
X-Banking-Partner-Signature: {hmac_signature}
X-Webhook-Event: escrow.released

Payload:
{
  "event": "escrow.released",
  "escrowId": "ESC-2024-001234-567890",
  "transactionId": "TXN-789",
  "status": "released",
  "amount": 5000.00
}
```

**Events:**
- `escrow.released` - Funds released to vendor
- `escrow.refunded` - Funds refunded to buyer
- `escrow.expired` - Escrow hold expired
- `escrow.failed` - Escrow operation failed

---

## Authentication

- **Method**: Bearer Token (API Key)
- **Header**: `Authorization: Bearer {api_key}`
- **Optional**: HMAC-SHA256 request signing for additional security

---

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `INSUFFICIENT_FUNDS` | Buyer account insufficient balance | Cancel order |
| `ESCROW_NOT_FOUND` | Escrow account not found | Check escrowId |
| `ESCROW_ALREADY_RELEASED` | Already released/refunded | Query status |
| `ESCROW_EXPIRED` | Escrow hold expired | Handle expiry |
| `INVALID_ACCOUNT` | Invalid vendor/buyer account | Verify account info |
| `UNAUTHORIZED` | Invalid API key | Check credentials |

---

## Complete Lifecycle

```
ORDER CREATED
     │
     ▼
ESCROW HOLD REQUESTED
     │
     ├─► Success ──► ESCROW HELD ──► ORDER PROCESSING
     │                                        │
     └─► Failed ────► ORDER CANCELLED        │
                                               │
                                        DELIVERY CONFIRMED
                                               │
                                               ├─► ESCROW RELEASED ──► VENDOR CREDITED ──► ORDER COMPLETED
                                               │
                                               └─► DISPUTE RAISED ──► ADMIN REVIEW ──┐
                                                                                      │
                                                                                      ├─► ESCROW REFUNDED ──► BUYER CREDITED ──► ORDER CANCELLED
                                                                                      │
                                                                                      └─► ESCROW RELEASED ──► VENDOR CREDITED ──► ORDER COMPLETED
```

---

## Integration Points in Ojawa Codebase

| Function | File | Action Required |
|----------|------|-----------------|
| `processEscrowPayment()` | `apps/buyer/src/services/escrowPaymentService.js` | Add banking partner API call |
| `releaseEscrowFunds()` | `apps/buyer/src/services/escrowPaymentService.js` | Replace with banking partner API |
| `refundEscrowFunds()` | `apps/buyer/src/services/escrowPaymentService.js` | Replace with banking partner API |
| `getEscrowStatus()` | `apps/buyer/src/services/escrowPaymentService.js` | Query banking partner API |
| New Webhook Handler | `functions/index.js` | Create new endpoint |

---

## Testing Checklist

- [ ] Create escrow hold (success)
- [ ] Create escrow hold (insufficient funds)
- [ ] Release escrow (success)
- [ ] Release escrow (already released)
- [ ] Refund escrow (success)
- [ ] Query escrow status
- [ ] Webhook received and processed
- [ ] Error handling (all error codes)
- [ ] Retry logic (transient failures)
- [ ] Authentication (valid/invalid API key)

---

## Support

- **Documentation Version**: 1.0
- **Last Updated**: 2024-01-15
- **See Also**: 
  - `BANKING_PARTNER_ESCROW_INTEGRATION.md` (Full Specification)
  - `ESCROW_INTEGRATION_DIAGRAMS.md` (Visual Diagrams)

---

*This is a simplified summary. Refer to the full documentation for complete details.*

