# Escrow Integration - Visual Diagrams

This document contains simplified visual diagrams showing the communication flow between Ojawa and the banking partner.

---

## 1. System Architecture

```mermaid
graph TB
    subgraph "Ojawa Platform"
        A[React Frontend] --> B[Firebase Functions]
        B --> C[Firestore Database]
        B --> D[Escrow Service Layer]
    end
    
    D -->|HTTPS API| E[Banking Partner API]
    E --> F[Escrow Account Management]
    F --> G[Bank-Managed Escrow Account]
    
    E -.->|Webhooks| B
```

---

## 2. Order Creation & Escrow Hold Flow

```mermaid
sequenceDiagram
    participant Buyer
    participant OjawaAPI
    participant Firestore
    participant BankingPartner
    
    Buyer->>OjawaAPI: 1. Checkout Request
    OjawaAPI->>Firestore: 2. Verify Buyer Wallet
    Firestore-->>OjawaAPI: 3. Wallet Balance OK
    
    OjawaAPI->>BankingPartner: 4. POST /api/v1/escrow/hold
    Note over BankingPartner: Create Escrow Account
    BankingPartner-->>OjawaAPI: 5. Escrow Created (escrowId)
    
    OjawaAPI->>Firestore: 6. Deduct from Buyer Wallet
    OjawaAPI->>Firestore: 7. Create Order Record
    OjawaAPI-->>Buyer: 8. Order Created Successfully
```

**Key API Call:**
```
POST /api/v1/escrow/hold
{
  "orderId": "ORD-2024-001234",
  "buyerId": "user_buyer_abc123",
  "vendorId": "user_vendor_xyz789",
  "amount": 5000.00,
  "currency": "NGN"
}

Response:
{
  "escrowId": "ESC-2024-001234-567890",
  "status": "held",
  "amount": 5000.00
}
```

---

## 3. Escrow Release Flow (Order Completion)

```mermaid
sequenceDiagram
    participant Buyer
    participant OjawaAPI
    participant Firestore
    participant BankingPartner
    
    Buyer->>OjawaAPI: 1. Confirm Delivery
    OjawaAPI->>Firestore: 2. Validate Order Status
    Firestore-->>OjawaAPI: 3. Order Valid
    
    OjawaAPI->>BankingPartner: 4. POST /api/v1/escrow/release
    Note over BankingPartner: Transfer to Vendor Account
    BankingPartner-->>OjawaAPI: 5. Release Confirmed (transactionId)
    
    OjawaAPI->>Firestore: 6. Update Order Status
    OjawaAPI->>Firestore: 7. Credit Vendor Wallet
    OjawaAPI-->>Buyer: 8. Order Completed
```

**Key API Call:**
```
POST /api/v1/escrow/release
{
  "escrowId": "ESC-2024-001234-567890",
  "vendorId": "user_vendor_xyz789",
  "amount": 5000.00
}

Response:
{
  "transactionId": "TXN-2024-001234-RELEASE-789",
  "status": "released"
}
```

---

## 4. Escrow Refund Flow (Dispute Resolution)

```mermaid
sequenceDiagram
    participant Admin
    participant OjawaAPI
    participant Firestore
    participant BankingPartner
    
    Admin->>OjawaAPI: 1. Resolve Dispute (Refund)
    OjawaAPI->>Firestore: 2. Validate Escrow Status
    Firestore-->>OjawaAPI: 3. Escrow Valid
    
    OjawaAPI->>BankingPartner: 4. POST /api/v1/escrow/refund
    Note over BankingPartner: Refund to Buyer Account
    BankingPartner-->>OjawaAPI: 5. Refund Confirmed (transactionId)
    
    OjawaAPI->>Firestore: 6. Update Order Status
    OjawaAPI->>Firestore: 7. Credit Buyer Wallet
    OjawaAPI-->>Admin: 8. Dispute Resolved
```

**Key API Call:**
```
POST /api/v1/escrow/refund
{
  "escrowId": "ESC-2024-001234-567890",
  "buyerId": "user_buyer_abc123",
  "amount": 5000.00,
  "reason": "Dispute resolved"
}

Response:
{
  "transactionId": "TXN-2024-001234-REFUND-456",
  "status": "refunded"
}
```

---

## 5. Webhook Notification Flow

```mermaid
sequenceDiagram
    participant BankingPartner
    participant OjawaWebhook
    participant Firestore
    participant NotificationService
    
    BankingPartner->>OjawaWebhook: POST /api/webhooks/escrow
    Note over BankingPartner: Escrow Status Change Event
    
    OjawaWebhook->>OjawaWebhook: Validate Signature
    OjawaWebhook->>Firestore: Update Escrow Status
    OjawaWebhook->>NotificationService: Send Notification
    OjawaWebhook-->>BankingPartner: 200 OK
```

**Webhook Payload Example:**
```
POST /api/webhooks/escrow
Headers:
  X-Banking-Partner-Signature: {hmac_signature}
  X-Webhook-Event: escrow.released

Body:
{
  "event": "escrow.released",
  "escrowId": "ESC-2024-001234-567890",
  "transactionId": "TXN-789",
  "status": "released"
}
```

---

## 6. Complete Escrow Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> OrderCreated: Buyer Checks Out
    
    OrderCreated --> EscrowHoldRequested: Initiate Payment
    
    EscrowHoldRequested --> EscrowHeld: Banking Partner Confirms
    EscrowHoldRequested --> OrderCancelled: Hold Failed
    
    EscrowHeld --> OrderProcessing: Funds Secured
    
    OrderProcessing --> DeliveryConfirmed: Buyer Receives Order
    OrderProcessing --> DisputeRaised: Issue Reported
    
    DeliveryConfirmed --> EscrowReleased: Confirm Delivery
    DisputeRaised --> AdminReview: Admin Investigates
    
    AdminReview --> EscrowRefunded: Favor Buyer
    AdminReview --> EscrowReleased: Favor Vendor
    
    EscrowReleased --> VendorCredited: Banking Partner Transfers
    EscrowRefunded --> BuyerCredited: Banking Partner Refunds
    
    VendorCredited --> OrderCompleted: [*]
    BuyerCredited --> OrderCancelled: [*]
    
    OrderCancelled --> [*]
    OrderCompleted --> [*]
```

---

## 7. API Endpoint Summary Table

| Operation | Method | Ojawa Endpoint | Banking Partner Endpoint | Purpose |
|-----------|--------|----------------|-------------------------|---------|
| Create Escrow | POST | `/api/escrow/create` | `POST /api/v1/escrow/hold` | Hold funds in escrow |
| Release Escrow | POST | `/api/escrow/release` | `POST /api/v1/escrow/release` | Release to vendor |
| Refund Escrow | POST | `/api/escrow/refund` | `POST /api/v1/escrow/refund` | Refund to buyer |
| Query Status | GET | `/api/escrow/{escrowId}` | `GET /api/v1/escrow/{escrowId}` | Get escrow status |
| Webhook | POST | `/api/webhooks/escrow` | - | Receive notifications |

---

## 8. Data Flow Diagram

```mermaid
flowchart LR
    A[Buyer Wallet] -->|1. Deduct| B[Escrow Hold Request]
    B -->|2. API Call| C[Banking Partner]
    C -->|3. Hold Funds| D[Escrow Account]
    
    D -->|4. Release| E[Vendor Account]
    D -->|5. Refund| A
    
    E -->|6. Credit| F[Vendor Wallet]
    A -->|7. Credit| G[Buyer Wallet Refund]
    
    style D fill:#f9f,stroke:#333,stroke-width:4px
    style C fill:#bbf,stroke:#333,stroke-width:2px
```

---

## 9. Error Handling Flow

```mermaid
flowchart TD
    A[API Request] --> B{Success?}
    B -->|Yes| C[Process Response]
    B -->|No| D{Retryable Error?}
    
    D -->|Yes| E{Retry Count < 3?}
    E -->|Yes| F[Wait & Retry]
    F --> A
    E -->|No| G[Log Error & Alert]
    
    D -->|No| H{Business Error?}
    H -->|Yes| I[Return Error to User]
    H -->|No| J[Log Critical Error]
    
    C --> K[Update Database]
    I --> L[End]
    J --> L
    G --> L
    K --> M[Success]
```

---

## 10. Security Flow

```mermaid
sequenceDiagram
    participant OjawaAPI
    participant AuthService
    participant BankingPartner
    
    OjawaAPI->>AuthService: Get API Key
    AuthService-->>OjawaAPI: Bearer Token
    
    OjawaAPI->>OjawaAPI: Sign Request (HMAC)
    OjawaAPI->>BankingPartner: API Request + Signature
    
    BankingPartner->>BankingPartner: Validate API Key
    BankingPartner->>BankingPartner: Validate Signature
    BankingPartner-->>OjawaAPI: Response + Webhook Signature
    
    OjawaAPI->>OjawaAPI: Validate Webhook Signature
```

---

## Quick Reference: Request/Response Examples

### Create Escrow Hold
**Request:**
```json
POST /api/v1/escrow/hold
{
  "orderId": "ORD-2024-001234",
  "buyerId": "user_buyer_abc123",
  "vendorId": "user_vendor_xyz789",
  "amount": 5000.00,
  "currency": "NGN"
}
```

**Response:**
```json
{
  "success": true,
  "escrowId": "ESC-2024-001234-567890",
  "status": "held",
  "amount": 5000.00
}
```

### Release Escrow
**Request:**
```json
POST /api/v1/escrow/release
{
  "escrowId": "ESC-2024-001234-567890",
  "vendorId": "user_vendor_xyz789",
  "amount": 5000.00
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "TXN-2024-001234-RELEASE-789",
  "status": "released"
}
```

### Refund Escrow
**Request:**
```json
POST /api/v1/escrow/refund
{
  "escrowId": "ESC-2024-001234-567890",
  "buyerId": "user_buyer_abc123",
  "amount": 5000.00
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "TXN-2024-001234-REFUND-456",
  "status": "refunded"
}
```

---

*These diagrams illustrate the core communication patterns between Ojawa and the banking partner for escrow management.*

