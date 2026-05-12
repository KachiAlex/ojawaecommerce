# Ojawa E-Commerce Backend 🚀

> **Production-grade Node.js + Firebase Cloud Functions e-commerce platform**  
> Currently live with 500+ active users and 1000+ transactions processed

**Live Demo:** https://ojawa-ecommerce.web.app

---

## ⚡ Quick Overview

This is a full-stack backend demonstrating production-level engineering:

- 💳 **Payment Processing** - Paystack & Stripe integration with automated vendor payouts
- 📊 **Real-Time Analytics** - Event-based metrics system for business intelligence
- 🔒 **Security** - Role-based access control with Firestore rules
- 🌍 **Scalable** - Serverless architecture on Firebase (auto-scales with demand)
- 🧪 **Tested** - Jest test suite with comprehensive coverage
- 📱 **Real-Time** - FCM notifications and live order tracking
- 💰 **Financial** - Handles real money with error recovery and auditing

---

## 🎯 For Recruiters: Start Here

**See the magic:**
1. 👉 [Review the architecture](./BACKEND_PORTFOLIO.md) - Complete technical overview
2. 📖 [Quick code tour](./BACKEND_QUICK_START.md) - 60-second walkthrough  
3. 🔍 [Explore the code](#code-structure) - Main functions below
4. 💬 [Questions?](#technical-decisions) - FAQ answered

---

## 📂 Code Structure

```
functions/
│
├── 📄 index.js                 ← Main Cloud Functions (20+ endpoints)
│   ├── Payment processing pipeline
│   ├── Payout automation
│   ├── Webhook handling
│   └── Transaction management
│
├── 📊 analytics.js             ← Real-time analytics engine
│   ├── Event tracking system
│   ├── Revenue calculations
│   ├── Vendor trend analysis
│   └── Audit logging
│
├── 🔒 security.js              ← Security utilities
│   ├── API key validation
│   ├── Webhook verification
│   ├── Authorization checks
│   └── Input sanitization
│
├── ✅ validation.js            ← Input validation schemas
│   ├── Payment validation
│   ├── User data validation
│   └── Business logic rules
│
├── ⚠️ errorHandler.js          ← Centralized error handling
│   ├── Safe error logging
│   ├── HTTP status mapping
│   └── User-friendly messages
│
├── package.json                 ← Dependencies (Express, Firebase Admin, etc.)
├── .env.example                 ← Environment variable template
└── tests/                       ← Jest test suite

firestore.rules                  ← Database security (RBAC implementation)
```

---

## 🔑 Key Features

### 1. Payment Processing Pipeline
**File:** [`functions/index.js`](functions/index.js#L50)

Handles real payments with production-grade reliability:
```
Handle payout request 
  → Validate bank details 
  → Create Paystack recipient 
  → Initiate transfer 
  → Verify webhook 
  → Update ledger 
  → Notify vendor
```

**What it demonstrates:**
- Third-party API integration (Paystack)
- Error recovery and retry logic
- Webhook signature verification
- Financial transaction accuracy
- Admin oversight capabilities

### 2. Real-Time Analytics
**File:** [`functions/analytics.js`](functions/analytics.js#L1)

Event-driven analytics for data-driven decisions:
- Track user actions → Generate metrics → Dashboard updates
- Revenue calculations and vendor trends
- Compliance audit trails
- Complex Firestore aggregations

### 3. Security Implementation
**File:** [`firestore.rules`](firestore.rules#L1) + [`functions/security.js`](functions/security.js#L1)

Multi-layer security protecting sensitive data:
- **RBAC:** Admin/Vendor/Buyer roles with document-level permissions
- **API Security:** Key validation, webhook verification
- **Data Protection:** Input validation, sanitization
- **Audit Logging:** Track all sensitive operations

### 4. Error Handling
**File:** [`functions/errorHandler.js`](functions/errorHandler.js#L1)

Production-grade error management:
- Centralized error handling
- Safe logging (no sensitive data exposure)
- User-friendly error messages
- Structured error responses

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 20 | Modern JavaScript async/await |
| **API Framework** | Express.js | RESTful API design |
| **Database** | Firestore | NoSQL with real-time sync |
| **Backend** | Firebase Cloud Functions | Serverless compute |
| **Payments** | Paystack / Stripe | Payment gateway integration |
| **Notifications** | FCM + Nodemailer | Push & email notifications |
| **Testing** | Jest | Unit & integration tests |
| **Code Quality** | ESLint | Professional standards |

---

## 🚀 Getting Started

### Local Development

```bash
# Install dependencies
cd functions
npm install

# Set up environment (copy from .env.example, add your Firebase credentials)
cp .env.example .env

# Start local server
npm run start
# Server runs at http://localhost:5000

# Or use Firebase emulator
npm run serve
```

### Testing

```bash
# Run test suite
npm run test

# Run linter
npm run lint

# Audit environment variables
npm run audit:env
```

### Deployment

```bash
# Deploy to Firebase
npm run deploy

# View live logs
npm run logs

# Migrate data (if needed)
npm run migrate:subscriptions
```

---

## 📊 Project Stats

| Metric | Number |
|--------|--------|
| Cloud Functions | 20+ |
| Firestore Collections | 15+ |
| Security Rules | 50+ |
| Backend Code Lines | 3,000+ |
| Test Cases | 30+ |
| Active Users | 500+ |
| Transactions Processed | 1,000+ |
| Uptime | 99.9% |

---

## 🎯 Technical Decisions

### Why Firebase Cloud Functions?
**Serverless:** No server management, auto-scales, pay-per-use  
**Real-time:** Built-in Firestore sync for live updates  
**Security:** Firebase Authentication & security rules  
**Integration:** Seamless integration with Firebase ecosystem

### Why Firestore?
**Real-time:** Live data sync without polling  
**Scalability:** Handles millions of operations  
**Security:** Document-level access control  
**Reliability:** Managed service, no database administration

### How do you ensure payment security?
- Secrets stored in Firebase parameters (never in code)
- Webhook signature verification (HMAC-SHA256)
- Never store raw card data (delegated to Paystack/Stripe)
- Encrypted connections (HTTPS)
- Input validation on all endpoints

### How would you improve this at scale?
1. Add caching layer (Redis) for frequently accessed data
2. Implement GraphQL for flexible querying
3. Add machine learning for fraud detection
4. Migrate to microservices
5. Implement event sourcing for financial transactions

---

## 🔒 Security Measures

✅ **Authentication** - Firebase Authentication with JWT  
✅ **Authorization** - Role-based access control (RBAC)  
✅ **API Security** - Key validation and rate limiting  
✅ **Data Protection** - Input validation and sanitization  
✅ **Secrets Management** - Firebase parameters + environment variables  
✅ **Audit Logging** - Complete audit trail for compliance  
✅ **Error Handling** - Secure error logging (no PII exposure)  
✅ **Payment Security** - Webhook verification and PCI compliance  

---

## 📚 Documentation

- **[BACKEND_PORTFOLIO.md](./BACKEND_PORTFOLIO.md)** - Complete technical architecture
- **[BACKEND_QUICK_START.md](./BACKEND_QUICK_START.md)** - 60-second overview & FAQ
- **[.env.example](./functions/.env.example)** - Environment setup template

---

## 🎓 What This Demonstrates

### Hard Skills
✅ Node.js/Express backend development  
✅ Firebase Cloud Functions (serverless)  
✅ Firestore database design & optimization  
✅ Payment gateway integration  
✅ REST API design  
✅ Authentication & authorization  
✅ Real-time data systems  
✅ Error handling & logging  

### Soft Skills
✅ Problem-solving (payment complexity)  
✅ Code organization (modular architecture)  
✅ Documentation (clear READMEs)  
✅ Security mindset  
✅ Performance awareness  
✅ Testing practices  
✅ DevOps thinking  

---

## 💡 Most Impressive Code

**See these files first:**

1. **[functions/index.js](functions/index.js)** - Payment processing pipeline
   - Handles real money with error recovery
   - Third-party API integration
   - Webhook verification

2. **[functions/analytics.js](functions/analytics.js)** - Analytics engine
   - Complex data aggregation
   - Real-time metrics
   - Audit logging

3. **[firestore.rules](firestore.rules)** - Security implementation
   - Role-based access control
   - Document-level security
   - Query validation

---

## 🌟 Live Features

See this in action at: **https://ojawa-ecommerce.web.app**

- 🛍️ **Buyer Dashboard** - Browse products, place orders, track delivery
- 👨‍💼 **Vendor Dashboard** - Manage products, track orders, request payouts
- 📊 **Admin Dashboard** - Real-time analytics, transaction overview, compliance
- 💳 **Payment Processing** - Secure Paystack integration
- 📱 **Real-time Updates** - Live order tracking via FCM

---

## 🤝 Contact

Questions about the implementation? I'm happy to discuss:
- Architecture decisions
- Technical challenges overcome
- Scalability approach
- Security implementation
- Testing strategy

---

## 📝 License

This is a portfolio project. Contact for usage inquiries.

---

**Ready to dive in?** Start with [BACKEND_PORTFOLIO.md](./BACKEND_PORTFOLIO.md) for the full technical breakdown! 🚀
