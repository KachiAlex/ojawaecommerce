# Comprehensive Testing Suites - All Types

**Date**: November 29, 2024  
**Status**: ✅ **Multiple Test Suites Created**

---

## 🎯 Testing Types Overview

Beyond npm-based unit/component tests, we've created test suites for:

1. ✅ **E2E Tests** (Playwright)
2. ✅ **API Tests** (Postman)
3. ✅ **Performance Tests** (Lighthouse, k6)
4. ✅ **Security Scanning** (OWASP ZAP)
5. ✅ **Accessibility Tests** (axe-core)
6. ✅ **Load Tests** (k6)
7. ⬜ **Visual Regression** (Percy/Chromatic - optional)
8. ⬜ **Manual Testing** (checklists)

---

## 1. 🎭 E2E Tests (Playwright)

### Setup

```bash
# Install Playwright
cd apps/buyer
npm install --save-dev @playwright/test
npx playwright install
```

### Test Files Created

1. **`e2e/tests/security.e2e.spec.js`**
   - API key exposure checks
   - Authentication requirements
   - File access restrictions
   - CSP header validation
   - XSS prevention
   - File upload validation

2. **`e2e/tests/paymentFlow.e2e.spec.js`**
   - Complete purchase flow
   - Payment cancellation
   - Order creation

3. **`e2e/tests/authFlow.e2e.spec.js`**
   - User registration
   - Login flow
   - Invalid credentials
   - Logout

### Configuration

**`e2e/playwright.config.js`** - Full Playwright configuration

### Run E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run in UI mode
npx playwright test --ui

# Run specific test
npx playwright test security

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

### Add to package.json

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

## 2. 🔌 API Tests (Postman)

### Collection Created

**`api-tests/postman/Ojawa_ECommerce_API.postman_collection.json`**

### Test Suites

1. **Authentication**
   - Login API
   - Registration API
   - Token validation

2. **Firebase Functions**
   - notifyVendorNewOrder
   - releaseEscrowFunds
   - Authentication checks

3. **Security Tests**
   - Unauthenticated access
   - CORS validation
   - Authorization checks

### Setup

1. **Install Postman**: https://www.postman.com/downloads/
2. **Import Collection**: 
   - Open Postman
   - File → Import
   - Select `api-tests/postman/Ojawa_ECommerce_API.postman_collection.json`

### Run API Tests

```bash
# Install Newman (Postman CLI)
npm install -g newman

# Run collection
newman run api-tests/postman/Ojawa_ECommerce_API.postman_collection.json \
  --environment api-tests/postman/environment.json
```

### Create Environment File

Create `api-tests/postman/environment.json`:

```json
{
  "name": "OJawa Production",
  "values": [
    {
      "key": "base_url",
      "value": "https://us-central1-ojawa-ecommerce.cloudfunctions.net"
    },
    {
      "key": "auth_token",
      "value": ""
    }
  ]
}
```

---

## 3. ⚡ Performance Tests

### Lighthouse Tests

**File**: `performance-tests/lighthouse.config.js`

### Run Lighthouse

```bash
# Install Lighthouse
npm install -g lighthouse

# Run performance audit
lighthouse https://ojawa-ecommerce.web.app \
  --config-path=performance-tests/lighthouse.config.js \
  --output=html \
  --output-path=performance-tests/results/lighthouse-report.html

# Run with CI mode
lighthouse https://ojawa-ecommerce.web.app \
  --config-path=performance-tests/lighthouse.config.js \
  --output=json \
  --output-path=performance-tests/results/lighthouse-report.json \
  --chrome-flags="--headless"
```

### Load Tests (k6)

**File**: `performance-tests/load-test.js`

### Setup k6

```bash
# Windows (using Chocolatey)
choco install k6

# Or download from: https://k6.io/docs/getting-started/installation/
```

### Run Load Tests

```bash
# Basic load test
k6 run performance-tests/load-test.js

# With custom URL
k6 run --env BASE_URL=https://ojawa-ecommerce.web.app performance-tests/load-test.js

# With custom VUs (Virtual Users)
k6 run --vus 50 --duration 5m performance-tests/load-test.js
```

### Performance Metrics

- **Response Time**: p95 < 2s
- **Error Rate**: < 1%
- **Throughput**: Requests per second
- **Resource Usage**: CPU, Memory

---

## 4. 🔒 Security Scanning (OWASP ZAP)

### Setup

**File**: `security-tests/owasp-zap-scan.sh`

### Install OWASP ZAP

```bash
# Windows: Download from https://www.zaproxy.org/download/
# Or use Docker:
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://ojawa-ecommerce.web.app
```

### Run Security Scan

```bash
# Make script executable (Linux/Mac)
chmod +x security-tests/owasp-zap-scan.sh

# Run scan
./security-tests/owasp-zap-scan.sh https://ojawa-ecommerce.web.app

# Or with Docker
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://ojawa-ecommerce.web.app \
  -J security-tests/zap-reports/report.json \
  -r security-tests/zap-reports/report.html
```

### What It Tests

- SQL Injection
- XSS vulnerabilities
- CSRF issues
- Security headers
- Authentication bypass
- Session management
- API security

---

## 5. ♿ Accessibility Tests

### Setup

**File**: `accessibility-tests/axe-core.test.js`

### Install Dependencies

```bash
npm install --save-dev @axe-core/playwright
```

### Run Accessibility Tests

```bash
# With Playwright
npx playwright test accessibility-tests/axe-core.test.js

# Or as part of E2E suite
npx playwright test --grep "accessibility"
```

### What It Tests

- WCAG 2.1 AA compliance
- ARIA labels
- Heading hierarchy
- Color contrast
- Keyboard navigation
- Screen reader compatibility

---

## 6. 📊 Visual Regression Tests (Optional)

### Option 1: Percy

```bash
# Install Percy
npm install --save-dev @percy/cli @percy/playwright

# Add to playwright.config.js
import { defineConfig } from '@playwright/test';
import { devices } from '@playwright/test';

export default defineConfig({
  use: {
    // ... existing config
  },
  projects: [
    {
      name: 'percy',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### Option 2: Chromatic (Storybook)

```bash
# Install Chromatic
npm install --save-dev chromatic

# Run visual tests
npx chromatic --project-token=your-token
```

---

## 7. 📝 Manual Testing Checklists

### Security Manual Tests

**File**: `manual-tests/SECURITY_MANUAL_TESTS.md`

1. **Authentication**
   - [ ] Try to access admin panel without login
   - [ ] Try SQL injection in search box
   - [ ] Try XSS in user input fields
   - [ ] Check for exposed API keys in browser console
   - [ ] Test file upload with malicious files

2. **Authorization**
   - [ ] Try to access another user's data
   - [ ] Try to modify another user's order
   - [ ] Try to access admin functions as vendor
   - [ ] Test role-based access control

3. **Payment Security**
   - [ ] Test with invalid card numbers
   - [ ] Test payment cancellation
   - [ ] Verify no payment data in logs
   - [ ] Test wallet balance manipulation attempts

---

## 📋 Test Execution Schedule

### Daily (CI/CD)
- ✅ Unit tests
- ✅ Component tests
- ✅ Security tests (npm)

### Weekly
- ✅ E2E tests (Playwright)
- ✅ API tests (Postman)
- ✅ Performance tests (Lighthouse)

### Monthly
- ✅ Security scanning (OWASP ZAP)
- ✅ Load testing (k6)
- ✅ Accessibility audit (axe-core)
- ✅ Manual security review

### Before Production Release
- ✅ All test suites
- ✅ Full security audit
- ✅ Performance benchmarking
- ✅ Accessibility compliance check

---

## 🚀 Quick Start Commands

### Run All Test Types

```bash
# 1. Unit/Component/Integration (npm)
cd apps/buyer
npm test

# 2. E2E Tests (Playwright)
npx playwright test

# 3. API Tests (Postman/Newman)
newman run api-tests/postman/Ojawa_ECommerce_API.postman_collection.json

# 4. Performance (Lighthouse)
lighthouse https://ojawa-ecommerce.web.app --config-path=performance-tests/lighthouse.config.js

# 5. Load Test (k6)
k6 run performance-tests/load-test.js

# 6. Security Scan (OWASP ZAP)
./security-tests/owasp-zap-scan.sh

# 7. Accessibility (Playwright + axe)
npx playwright test accessibility-tests/axe-core.test.js
```

---

## 📊 Test Coverage Matrix

| Test Type | Tool | Status | Frequency |
|-----------|------|--------|-----------|
| Unit Tests | Vitest | ✅ Created | Every commit |
| Component Tests | Vitest + RTL | ✅ Created | Every commit |
| Integration Tests | Vitest | ✅ Created | Every commit |
| Security Tests | Vitest | ✅ Created | Every commit |
| E2E Tests | Playwright | ✅ Created | Daily/Weekly |
| API Tests | Postman | ✅ Created | Weekly |
| Performance Tests | Lighthouse | ✅ Created | Weekly |
| Load Tests | k6 | ✅ Created | Monthly |
| Security Scanning | OWASP ZAP | ✅ Created | Monthly |
| Accessibility | axe-core | ✅ Created | Weekly |
| Visual Regression | Percy/Chromatic | ⬜ Optional | As needed |
| Manual Testing | Checklists | ✅ Created | Before release |

---

## 🛠️ Installation Guide

### Required Tools

```bash
# 1. Playwright (E2E)
npm install --save-dev @playwright/test
npx playwright install

# 2. Newman (Postman CLI)
npm install -g newman

# 3. Lighthouse (Performance)
npm install -g lighthouse

# 4. k6 (Load Testing)
# Download from: https://k6.io/docs/getting-started/installation/

# 5. OWASP ZAP (Security)
# Download from: https://www.zaproxy.org/download/

# 6. axe-core (Accessibility)
npm install --save-dev @axe-core/playwright
```

---

## 📁 File Structure

```
.
├── e2e/
│   ├── playwright.config.js
│   └── tests/
│       ├── security.e2e.spec.js
│       ├── paymentFlow.e2e.spec.js
│       └── authFlow.e2e.spec.js
├── api-tests/
│   └── postman/
│       └── Ojawa_ECommerce_API.postman_collection.json
├── performance-tests/
│   ├── lighthouse.config.js
│   └── load-test.js
├── security-tests/
│   └── owasp-zap-scan.sh
├── accessibility-tests/
│   └── axe-core.test.js
└── apps/buyer/src/test/
    ├── security/
    ├── unit/
    ├── component/
    └── integration/
```

---

## 🎯 Test Execution Priority

### Critical (Run Before Every Deployment)
1. ✅ Security tests (npm)
2. ✅ Unit tests
3. ✅ Component tests

### High Priority (Run Weekly)
4. ✅ E2E tests
5. ✅ API tests
6. ✅ Performance tests

### Medium Priority (Run Monthly)
7. ✅ Security scanning
8. ✅ Load testing
9. ✅ Accessibility audit

### Optional (As Needed)
10. ⬜ Visual regression
11. ⬜ Manual testing

---

## 📚 Documentation

- **E2E Tests**: `e2e/playwright.config.js` + test files
- **API Tests**: `api-tests/postman/` collection
- **Performance**: `performance-tests/` configs
- **Security**: `security-tests/` scripts
- **Accessibility**: `accessibility-tests/` tests

---

## ✅ Summary

### Created Test Suites

- ✅ **E2E Tests**: 3 test files (Playwright)
- ✅ **API Tests**: Postman collection
- ✅ **Performance Tests**: Lighthouse + k6 configs
- ✅ **Security Scanning**: OWASP ZAP script
- ✅ **Accessibility**: axe-core tests
- ✅ **Load Tests**: k6 script

### Total Test Coverage

- **npm-based**: 8 files, 85+ tests ✅
- **E2E**: 3 files, 10+ scenarios ✅
- **API**: 1 collection, 5+ endpoints ✅
- **Performance**: 2 configs ✅
- **Security**: 1 script ✅
- **Accessibility**: 1 test file ✅

---

**Last Updated**: November 29, 2024  
**Status**: ✅ **All Test Types Created - Ready for Execution**

