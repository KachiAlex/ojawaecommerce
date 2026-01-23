# Ojawa Payment & Escrow Flow

## 1. Purpose
This document explains how the Ojawa marketplace moves funds from buyers into escrow, releases payouts to vendors and logistics partners, and retains the platform's 5% commission. It is intended for banking partners so they can expose the required escrow APIs (hold, release, refund, status, and webhooks).

## 2. Actors & Ledgers
| Actor | Description | Ledger Impact |
|-------|-------------|---------------|
| Buyer | Places an order and funds escrow from wallet/top-up | Wallet debited → Escrow credited |
| Ojawa Escrow Account | Bank-managed pooled account | Receives holds, releases funds per instructions |
| Vendor | Merchant fulfilling order | Receives escrow release minus platform commission |
| Logistics Partner | Handles shipping | Paid from order's logistics allocation once delivery confirmed |
| Ojawa Platform | Marketplace operator | Receives 5% commission per order |

## 3. Lifecycle Overview
```
Buyer Checkout → Escrow Hold → Order Fulfillment & Logistics → Buyer Confirms Delivery
      │                 │                                  │
      └───────────────▶│                                  │
                        └─▶ Escrow Release ─▶ Commission withheld ─▶ Vendor + Logistics paid
                          └─▶ OR Refund (if dispute) ─▶ Buyer refunded
```

## 4. Detailed Flow
### 4.1 Checkout & Escrow Funding
1. Buyer completes checkout in the Ojawa app (wallet balance or external funding).
2. `processEscrowPayment` verifies wallet balance and moves total order amount (items + logistics) into escrow. (`apps/buyer/src/services/escrowPaymentService.js`)
3. Ojawa calls the bank endpoint `POST /api/v1/escrow/hold` with order ID, buyer ID, vendor ID, amount, and currency.
4. Banking partner responds with `escrowId` and `status=held`.
5. Ojawa stores `escrowId`, sets order status `escrow_funded`, and marks payment status `escrow_funded`. (`ORDER_FLOW_SUMMARY.md`)

### 4.2 Order Fulfillment & Logistics
1. Vendor sees the order with "Escrow Funded" badge and prepares shipment.
2. Logistics pricing engine (intracity/intercity/international + multipliers) determines the logistics portion already included in the escrowed total. (`LOGISTICS_PRICING_IMPLEMENTATION.md`)
3. Logistics partner performs delivery and updates statuses (shipped/delivered) via vendor dashboard or automated updates.
4. Throughout fulfillment, funds remain locked in escrow.

### 4.3 Buyer Confirmation & Release
1. Buyer receives order and taps "Confirm Delivery".
2. OrderConfirmationModal collects satisfaction confirmation.
3. Ojawa server:
   - Calls `releaseEscrowFunds(orderId, buyerId, vendorId, amount)` to move funds from escrow to vendor wallet (less commission).
   - Calls bank endpoint `POST /api/v1/escrow/release` with `escrowId`, `vendorId`, release amount, and optional logistics allocations.
4. Banking partner executes transfer to vendor/logistics bank accounts.
5. Ojawa receives webhook `escrow.released` confirming settlement and updates order to `completed`.

### 4.4 Commission Handling (5%)
1. Platform commission configuration defaults to 5% with min ₦50 and max ₦5,000. (`apps/buyer/src/pages/Admin.jsx`)
2. On release, Ojawa computes `commission = max(min, min(max, totalAmount * 5%))`.
3. Instructions sent to the bank split the escrowed total: 95% routed to vendor/logistics beneficiaries, 5% to Ojawa's revenue account.
4. Commission history is saved in Firestore for auditing.

### 4.5 Logistics Payouts
1. Logistics fees are part of the buyer's checkout total.
2. When release occurs, Ojawa specifies how much of the escrow is routed to each logistics partner account based on the partner that fulfilled the order.
3. Alternative flow: Ojawa credits logistics partner wallets internally, and bank only transfers the vendor share plus Ojawa commission. (Configurable per partner agreement.)

### 4.6 Refund / Dispute Flow
1. Buyer opens a dispute; admin reviews evidence.
2. If refund approved:
   - Ojawa calls bank endpoint `POST /api/v1/escrow/refund` with `escrowId`, buyer ID, amount, and reason.
   - Banking partner refunds buyer account/wallet and sends webhook `escrow.refunded`.
3. Ojawa updates order to `cancelled` or `refunded`, credits buyer wallet, and logs the refund transaction.
4. If dispute resolved in vendor's favor, the normal release flow runs (Section 4.3).

## 5. API Expectations for Banking Partner
| Action | Method & Endpoint | Request Fields | Response |
|--------|------------------|----------------|----------|
| Create Escrow Hold | `POST /api/v1/escrow/hold` | `orderId`, `buyerId`, `vendorId`, `amount`, `currency` | `{ escrowId, status }` |
| Release Escrow | `POST /api/v1/escrow/release` | `escrowId`, `vendorId`, `amount`, optional `split[]` for logistics | `{ transactionId, status }` |
| Refund Escrow | `POST /api/v1/escrow/refund` | `escrowId`, `buyerId`, `amount`, `reason` | `{ transactionId, status }` |
| Query Status | `GET /api/v1/escrow/{escrowId}` | Path param `escrowId` | `{ status, amount, history[] }` |
| Webhook | `POST {bank->Ojawa}/api/webhooks/escrow` | `event`, `escrowId`, `transactionId`, `status`, `amount` | `200 OK` |

## 6. Webhook Events
- `escrow.held` – confirmation that funds are locked.
- `escrow.released` – vendor/logistics transfer succeeded.
- `escrow.refunded` – buyer refund completed.
- `escrow.failed` / `escrow.expired` – failed operations; Ojawa retries or alerts admin.
All webhook requests include HMAC signature headers that Ojawa verifies before processing.

## 7. Data Structures Tracked in Ojawa
```json
order: {
  orderId: "ORD-2026-0001",
  buyerId: "buyer_abc",
  vendorId: "vendor_xyz",
  escrowId: "ESC-2026-1234",
  totalAmount: 5000,
  logisticsAmount: 800,
  commissionPercent: 5,
  commissionAmount: 250,
  status: "escrow_funded" | "shipped" | "completed" | "refunded",
  paymentStatus: "escrow_funded" | "released" | "refunded"
}
```

## 8. Security & Compliance
- All Ojawa → bank calls use HTTPS with Bearer API keys and optional HMAC signing.
- Webhook signatures validated server-side before mutating records.
- Auditable logs stored in Firestore: escrow actions, commission calculations, release/refund confirmations.
- Role-based access ensures only admins can trigger refunds or override payouts.

## 9. Error & Retry Handling
1. **Transient errors**: Ojawa retries hold/release/refund up to 3 times with exponential backoff.
2. **Business errors** (e.g., insufficient funds, invalid accounts) bubble up to the UI so buyers/admins can take corrective action.
3. **Webhook timeouts**: Bank should retry deliveries; Ojawa ensures idempotency via `escrowId` + `transactionId` keys.

## 10. Requirements for Bank API Delivery
- Provide sandbox keys for integration testing.
- Share IP addresses or domains for webhook whitelisting if required.
- Confirm settlement timelines (T+0 or T+1) for vendor/logistics payouts.
- Support split disbursement (vendor + logistics + platform commission) or allow Ojawa to trigger multiple transfers per release.

## 11. References
- `ESCROW_INTEGRATION_SUMMARY.md`
- `ESCROW_INTEGRATION_DIAGRAMS.md`
- `LOGISTICS_PRICING_IMPLEMENTATION.md`
- `ORDER_FLOW_SUMMARY.md`
- `apps/buyer/src/services/escrowPaymentService.js`
- `apps/buyer/src/pages/Admin.jsx`
