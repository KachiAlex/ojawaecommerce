# Banking Partner Escrow Integration - Schematic Diagram

## Overview

This document outlines how Ojawa's escrow endpoints will communicate with the banking partner's API for secure fund management. The integration enables real escrow account management through the banking partner while maintaining Ojawa's existing order and user management systems.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         OJAWA PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │   Frontend   │────▶│  Backend API │────▶│  Firestore   │   │
│  │  (React App) │     │  (Functions) │     │   Database   │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
│         │                     │                                  │
│         │                     │                                  │
│         └─────────────────────┘                                  │
│                     │                                             │
│                     ▼                                             │
│         ┌─────────────────────┐                                 │
│         │  Escrow Service     │                                 │
│         │  (Integration Layer)│                                 │
│         └─────────────────────┘                                 │
│                     │                                             │
└─────────────────────┼─────────────────────────────────────────────┘
                      │
                      │ HTTPS API Calls
                      │ (REST/JSON)
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BANKING PARTNER API                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Escrow Account Management Endpoints             │    │
│  │  • Create Escrow Hold                                   │    │
│  │  • Release Escrow Funds                                 │    │
│  │  • Refund Escrow Funds                                  │    │
│  │  • Query Escrow Status                                  │    │
│  │  • Webhook Notifications                                │    │
│  └────────────────────────────────────────────────────────┘    │
│                      │                                            │
│                      ▼                                            │
│         ┌──────────────────────┐                                │
│         │   Escrow Account     │                                │
│         │   (Bank-Managed)     │                                │
│         └──────────────────────┘                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Integration Flow: Order Escrow Lifecycle

### Phase 1: Order Creation & Escrow Hold

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Buyer   │         │  Ojawa   │         │ Banking  │         │Firestore │
│          │         │  API     │         │ Partner  │         │          │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Checkout        │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │                    │                    │
     │                    │ 2. Verify Buyer    │                    │
     │                    │    Wallet Balance  │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │ 3. Wallet OK       │                    │
     │                    │◀───────────────────│                    │
     │                    │                    │                    │
     │                    │ 4. Create Escrow   │                    │
     │                    │    Hold Request    │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │                    │ 5. Create Escrow   │
     │                    │                    │    Account Entry   │
     │                    │                    │                    │
     │                    │ 6. Escrow Created  │                    │
     │                    │    Response        │                    │
     │                    │◀───────────────────│                    │
     │                    │    {               │                    │
     │                    │      escrowId:     │                    │
     │                    │      "ESC-123",    │                    │
     │                    │      status:       │                    │
     │                    │      "held",       │                    │
     │                    │      amount: 5000  │                    │
     │                    │    }               │                    │
     │                    │                    │                    │
     │                    │ 7. Deduct from     │                    │
     │                    │    Buyer Wallet    │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │ 8. Create Order    │                    │
     │                    │    Record          │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │ 9. Order Created   │                    │                    │
     │    Success         │                    │                    │
     │◀───────────────────│                    │                    │
     │                    │                    │                    │
```

**API Endpoint Specification: Create Escrow Hold**

**Ojawa → Banking Partner**
- **Endpoint**: `POST /api/v1/escrow/hold`
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer {api_key}
  X-Ojawa-Order-Id: {orderId}
  ```
- **Request Body**:
  ```json
  {
    "orderId": "ORD-2024-001234",
    "buyerId": "user_buyer_abc123",
    "vendorId": "user_vendor_xyz789",
    "amount": 5000.00,
    "currency": "NGN",
    "description": "Escrow payment for order ORD-2024-001234",
    "metadata": {
      "buyerEmail": "buyer@example.com",
      "vendorEmail": "vendor@example.com",
      "items": ["Product A", "Product B"]
    },
    "expiryDate": "2024-12-31T23:59:59Z",
    "callbackUrl": "https://ojawa-ecommerce.web.app/api/webhooks/escrow"
  }
  ```
- **Response** (Success):
  ```json
  {
    "success": true,
    "escrowId": "ESC-2024-001234-567890",
    "status": "held",
    "amount": 5000.00,
    "currency": "NGN",
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-12-31T23:59:59Z",
    "reference": "OJ-ESC-2024-001234"
  }
  ```
- **Response** (Error):
  ```json
  {
    "success": false,
    "error": {
      "code": "INSUFFICIENT_FUNDS",
      "message": "Buyer account has insufficient balance",
      "details": {}
    }
  }
  ```

---

### Phase 2: Order Delivery & Escrow Release

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Buyer   │         │  Ojawa   │         │ Banking  │         │Firestore │
│          │         │  API     │         │ Partner  │         │          │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Confirm         │                    │                    │
     │    Delivery        │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │                    │                    │
     │                    │ 2. Validate Order  │                    │
     │                    │    & Escrow Status │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │ 3. Order Valid     │                    │
     │                    │◀───────────────────│                    │
     │                    │                    │                    │
     │                    │ 4. Release Escrow  │                    │
     │                    │    Request         │                    │
     │                    │───────────────────▶│                    │
     │                    │    {               │                    │
     │                    │      escrowId:     │                    │
     │                    │      "ESC-123",    │                    │
     │                    │      action:       │                    │
     │                    │      "release",    │                    │
     │                    │      vendorId:     │                    │
     │                    │      "vendor_xyz"  │                    │
     │                    │    }               │                    │
     │                    │                    │                    │
     │                    │                    │ 5. Transfer Funds  │
     │                    │                    │    to Vendor       │
     │                    │                    │                    │
     │                    │ 6. Release         │                    │
     │                    │    Confirmation    │                    │
     │                    │◀───────────────────│                    │
     │                    │    {               │                    │
     │                    │      success: true,│                    │
     │                    │      transactionId:│                    │
     │                    │      "TXN-789",    │                    │
     │                    │      releasedAt:   │                    │
     │                    │      "2024-01-20T  │                    │
     │                    │       15:30:00Z"   │                    │
     │                    │    }               │                    │
     │                    │                    │                    │
     │                    │ 7. Update Order    │                    │
     │                    │    Status          │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │ 8. Credit Vendor   │                    │
     │                    │    Wallet          │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │ 9. Order           │                    │                    │
     │    Completed       │                    │                    │
     │◀───────────────────│                    │                    │
     │                    │                    │                    │
```

**API Endpoint Specification: Release Escrow Funds**

**Ojawa → Banking Partner**
- **Endpoint**: `POST /api/v1/escrow/release`
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer {api_key}
  X-Ojawa-Order-Id: {orderId}
  ```
- **Request Body**:
  ```json
  {
    "escrowId": "ESC-2024-001234-567890",
    "orderId": "ORD-2024-001234",
    "vendorId": "user_vendor_xyz789",
    "vendorAccountNumber": "1234567890",
    "vendorBankCode": "058",
    "amount": 5000.00,
    "currency": "NGN",
    "reason": "Order delivery confirmed by buyer",
    "metadata": {
      "confirmedBy": "buyer",
      "confirmedAt": "2024-01-20T15:25:00Z",
      "buyerSatisfaction": true
    }
  }
  ```
- **Response** (Success):
  ```json
  {
    "success": true,
    "transactionId": "TXN-2024-001234-RELEASE-789",
    "escrowId": "ESC-2024-001234-567890",
    "status": "released",
    "amount": 5000.00,
    "releasedTo": "user_vendor_xyz789",
    "releasedAt": "2024-01-20T15:30:00Z",
    "bankReference": "BP-REF-2024-789456"
  }
  ```
- **Response** (Error):
  ```json
  {
    "success": false,
    "error": {
      "code": "ESCROW_NOT_FOUND",
      "message": "Escrow account not found or already released",
      "details": {}
    }
  }
  ```

---

### Phase 3: Dispute Resolution & Refund

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Admin   │         │  Ojawa   │         │ Banking  │         │Firestore │
│          │         │  API     │         │ Partner  │         │          │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Resolve         │                    │                    │
     │    Dispute         │                    │                    │
     │    (Refund Buyer)  │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │                    │                    │
     │                    │ 2. Validate        │                    │
     │                    │    Escrow Status   │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │ 3. Escrow Valid    │                    │
     │                    │◀───────────────────│                    │
     │                    │                    │                    │
     │                    │ 4. Refund Escrow   │                    │
     │                    │    Request         │                    │
     │                    │───────────────────▶│                    │
     │                    │    {               │                    │
     │                    │      escrowId:     │                    │
     │                    │      "ESC-123",    │                    │
     │                    │      action:       │                    │
     │                    │      "refund",     │                    │
     │                    │      buyerId:      │                    │
     │                    │      "buyer_abc"   │                    │
     │                    │    }               │                    │
     │                    │                    │                    │
     │                    │                    │ 5. Refund Funds    │
     │                    │                    │    to Buyer        │
     │                    │                    │                    │
     │                    │ 6. Refund          │                    │
     │                    │    Confirmation    │                    │
     │                    │◀───────────────────│                    │
     │                    │    {               │                    │
     │                    │      success: true,│                    │
     │                    │      transactionId:│                    │
     │                    │      "TXN-REF-456" │                    │
     │                    │    }               │                    │
     │                    │                    │                    │
     │                    │ 7. Update Order    │                    │
     │                    │    & Refund Buyer  │                    │
     │                    │    Wallet          │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │ 8. Dispute         │                    │                    │
     │    Resolved        │                    │                    │
     │◀───────────────────│                    │                    │
     │                    │                    │                    │
```

**API Endpoint Specification: Refund Escrow Funds**

**Ojawa → Banking Partner**
- **Endpoint**: `POST /api/v1/escrow/refund`
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer {api_key}
  X-Ojawa-Order-Id: {orderId}
  ```
- **Request Body**:
  ```json
  {
    "escrowId": "ESC-2024-001234-567890",
    "orderId": "ORD-2024-001234",
    "buyerId": "user_buyer_abc123",
    "buyerAccountNumber": "9876543210",
    "buyerBankCode": "058",
    "amount": 5000.00,
    "currency": "NGN",
    "reason": "Dispute resolved in favor of buyer",
    "refundType": "full",
    "metadata": {
      "resolvedBy": "admin",
      "resolvedAt": "2024-01-18T12:00:00Z",
      "disputeReason": "Product not as described",
      "adminId": "admin_xyz"
    }
  }
  ```
- **Response** (Success):
  ```json
  {
    "success": true,
    "transactionId": "TXN-2024-001234-REFUND-456",
    "escrowId": "ESC-2024-001234-567890",
    "status": "refunded",
    "amount": 5000.00,
    "refundedTo": "user_buyer_abc123",
    "refundedAt": "2024-01-18T12:05:00Z",
    "bankReference": "BP-REF-2024-456123"
  }
  ```

---

### Phase 4: Escrow Status Query

**API Endpoint Specification: Query Escrow Status**

**Ojawa → Banking Partner**
- **Endpoint**: `GET /api/v1/escrow/{escrowId}`
- **Headers**:
  ```
  Authorization: Bearer {api_key}
  ```
- **Response** (Success):
  ```json
  {
    "success": true,
    "escrowId": "ESC-2024-001234-567890",
    "orderId": "ORD-2024-001234",
    "status": "held",
    "amount": 5000.00,
    "currency": "NGN",
    "buyerId": "user_buyer_abc123",
    "vendorId": "user_vendor_xyz789",
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-12-31T23:59:59Z",
    "lastUpdated": "2024-01-15T10:30:00Z",
    "history": [
      {
        "action": "created",
        "timestamp": "2024-01-15T10:30:00Z",
        "amount": 5000.00
      }
    ]
  }
  ```

---

## Webhook Notifications (Banking Partner → Ojawa)

The banking partner will send webhook notifications to Ojawa for escrow status changes.

**Webhook Endpoint Specification**

**Banking Partner → Ojawa**
- **Endpoint**: `POST /api/webhooks/escrow`
- **Headers**:
  ```
  Content-Type: application/json
  X-Banking-Partner-Signature: {hmac_signature}
  X-Webhook-Event: {event_type}
  ```
- **Webhook Payload** (Escrow Released):
  ```json
  {
    "event": "escrow.released",
    "escrowId": "ESC-2024-001234-567890",
    "orderId": "ORD-2024-001234",
    "transactionId": "TXN-2024-001234-RELEASE-789",
    "status": "released",
    "amount": 5000.00,
    "currency": "NGN",
    "releasedTo": "user_vendor_xyz789",
    "releasedAt": "2024-01-20T15:30:00Z",
    "timestamp": "2024-01-20T15:30:05Z"
  }
  ```
- **Webhook Payload** (Escrow Refunded):
  ```json
  {
    "event": "escrow.refunded",
    "escrowId": "ESC-2024-001234-567890",
    "orderId": "ORD-2024-001234",
    "transactionId": "TXN-2024-001234-REFUND-456",
    "status": "refunded",
    "amount": 5000.00,
    "currency": "NGN",
    "refundedTo": "user_buyer_abc123",
    "refundedAt": "2024-01-18T12:05:00Z",
    "timestamp": "2024-01-18T12:05:10Z"
  }
  ```
- **Webhook Payload** (Escrow Expired):
  ```json
  {
    "event": "escrow.expired",
    "escrowId": "ESC-2024-001234-567890",
    "orderId": "ORD-2024-001234",
    "status": "expired",
    "amount": 5000.00,
    "expiredAt": "2024-12-31T23:59:59Z",
    "timestamp": "2025-01-01T00:00:05Z"
  }
  ```

---

## Complete Endpoint Summary

### Ojawa Endpoints (To Be Modified)

1. **Process Escrow Payment**
   - **Current**: `apps/buyer/src/services/escrowPaymentService.js::processEscrowPayment()`
   - **Modification**: Add banking partner API call to create escrow hold
   - **Firebase Function**: `functions/index.js::releaseEscrowFunds` (new endpoint needed)

2. **Release Escrow Funds**
   - **Current**: `apps/buyer/src/services/escrowPaymentService.js::releaseEscrowFunds()`
   - **Modification**: Call banking partner API to release funds
   - **Firebase Function**: `functions/index.js::releaseEscrowFunds` (modify existing)

3. **Refund Escrow Funds**
   - **Current**: `apps/buyer/src/services/escrowPaymentService.js::refundEscrowFunds()`
   - **Modification**: Call banking partner API to refund funds
   - **Firebase Function**: New endpoint needed

4. **Get Escrow Status**
   - **Current**: `apps/buyer/src/services/escrowPaymentService.js::getEscrowStatus()`
   - **Modification**: Query banking partner API for real-time status
   - **Firebase Function**: New endpoint needed

5. **Webhook Handler**
   - **New**: `functions/index.js::handleEscrowWebhook()`
   - **Purpose**: Receive and process webhook notifications from banking partner

### Banking Partner API Endpoints (Expected)

1. **POST** `/api/v1/escrow/hold` - Create escrow hold
2. **POST** `/api/v1/escrow/release` - Release escrow to vendor
3. **POST** `/api/v1/escrow/refund` - Refund escrow to buyer
4. **GET** `/api/v1/escrow/{escrowId}` - Query escrow status
5. **GET** `/api/v1/escrow/order/{orderId}` - Query escrow by order ID
6. **POST** `/api/v1/webhooks/register` - Register webhook URLs (optional)

---

## Data Flow: Complete Escrow Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ESCROW LIFECYCLE STATE MACHINE                  │
└─────────────────────────────────────────────────────────────────────┘

                    [Order Created]
                         │
                         ▼
              [Escrow Hold Requested]
                         │
                         ├─► Success ──► [Escrow Held] ──┐
                         │                                  │
                         └─► Failed ────► [Order Cancelled]│
                                                           │
                                                           │
        [Delivery Confirmed] ◀─────── [Order Processing] ◀┘
                 │
                 ├─► [Escrow Released] ──► [Vendor Credited] ──► [Order Completed]
                 │
                 └─► [Dispute Raised] ──► [Admin Reviews] ──┐
                                                              │
                                                              ├─► [Escrow Refunded] ──► [Buyer Credited] ──► [Order Cancelled]
                                                              │
                                                              └─► [Escrow Released] ──► [Vendor Credited] ──► [Order Completed]
```

---

## Security & Authentication

### Authentication Method
- **Type**: API Key (Bearer Token)
- **Header**: `Authorization: Bearer {api_key}`
- **Storage**: Environment variables in Firebase Functions
- **Rotation**: Regular rotation supported via environment variable updates

### Request Signing (Optional but Recommended)
- **Method**: HMAC-SHA256
- **Header**: `X-Ojawa-Signature`
- **Payload**: Request body + timestamp + nonce
- **Validation**: Banking partner validates signature on each request

### Webhook Security
- **Method**: HMAC-SHA256 signature validation
- **Header**: `X-Banking-Partner-Signature`
- **Validation**: Ojawa validates signature on webhook receipt

---

## Error Handling & Retry Logic

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "additional error details"
    },
    "retryable": true,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes
- `INSUFFICIENT_FUNDS` - Buyer account has insufficient balance
- `ESCROW_NOT_FOUND` - Escrow account not found
- `ESCROW_ALREADY_RELEASED` - Escrow has already been released
- `ESCROW_EXPIRED` - Escrow hold has expired
- `INVALID_ACCOUNT` - Vendor/Buyer account information invalid
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `UNAUTHORIZED` - Invalid API key
- `INTERNAL_SERVER_ERROR` - Banking partner server error

### Retry Strategy
- **Automatic Retries**: 3 attempts for transient errors (5xx, network failures)
- **Exponential Backoff**: 1s, 2s, 4s delays between retries
- **Idempotency**: Use idempotency keys to prevent duplicate operations

---

## Integration Checklist

### Phase 1: Setup & Testing
- [ ] Obtain API credentials from banking partner
- [ ] Set up environment variables in Firebase Functions
- [ ] Implement HTTP client wrapper for banking partner API
- [ ] Create test endpoints for sandbox environment
- [ ] Implement error handling and logging

### Phase 2: Core Integration
- [ ] Implement escrow hold creation (`processEscrowPayment`)
- [ ] Implement escrow release (`releaseEscrowFunds`)
- [ ] Implement escrow refund (`refundEscrowFunds`)
- [ ] Implement escrow status query (`getEscrowStatus`)
- [ ] Implement webhook handler

### Phase 3: Testing
- [ ] Unit tests for all integration functions
- [ ] Integration tests with banking partner sandbox
- [ ] End-to-end flow testing
- [ ] Error scenario testing
- [ ] Webhook testing

### Phase 4: Deployment
- [ ] Deploy to staging environment
- [ ] Perform UAT (User Acceptance Testing)
- [ ] Deploy to production
- [ ] Monitor initial transactions
- [ ] Set up alerts and monitoring

---

## Monitoring & Logging

### Key Metrics to Track
- Escrow creation success rate
- Escrow release success rate
- Escrow refund success rate
- API response times
- Error rates by type
- Webhook delivery success rate

### Logging Requirements
- All API requests/responses (with sensitive data masked)
- Error stack traces
- Transaction IDs for traceability
- Timestamps for all operations
- User IDs and order IDs

---

## Support & Contact

For questions or issues regarding this integration:
- **Technical Contact**: [Your Tech Lead Email]
- **Banking Partner Support**: [Banking Partner Contact]
- **Documentation Version**: 1.0
- **Last Updated**: 2024-01-15

---

## Appendix: Example Integration Code Structure

### Firebase Function Structure
```
functions/
  ├── src/
  │   ├── escrow/
  │   │   ├── bankingPartnerClient.js    # HTTP client for banking partner
  │   │   ├── createEscrowHold.js        # Create escrow hold
  │   │   ├── releaseEscrow.js           # Release escrow funds
  │   │   ├── refundEscrow.js            # Refund escrow funds
  │   │   ├── getEscrowStatus.js         # Query escrow status
  │   │   └── webhookHandler.js          # Handle webhooks
  │   └── index.js                       # Function exports
  └── package.json
```

### Frontend Service Structure
```
apps/buyer/src/services/
  ├── escrowPaymentService.js            # Main escrow service (modify)
  └── bankingPartnerService.js           # New: Banking partner API wrapper
```

---

## Notes

1. **Idempotency**: All escrow operations should be idempotent. Use unique request IDs to prevent duplicate processing.

2. **Reconciliation**: Implement daily reconciliation process to sync escrow status between Ojawa and banking partner.

3. **Fallback**: Maintain ability to fall back to internal wallet-based escrow if banking partner API is unavailable (graceful degradation).

4. **Compliance**: Ensure all operations comply with financial regulations and PCI-DSS requirements.

5. **Rate Limiting**: Respect banking partner's rate limits and implement appropriate throttling.

---

*End of Document*

