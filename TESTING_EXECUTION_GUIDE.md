# Complete Testing Execution Guide

## 🎯 All Test Types Available

This guide covers execution of ALL test types, not just npm-based tests.

---

## 1. 📦 NPM-Based Tests (Vitest)

### Run Commands

```bash
cd apps/buyer

# All tests
npm test

# Specific suites
npm test -- security
npm test -- unit
npm test -- component
npm test -- integration

# With coverage
npm run test:coverage

# With UI
npm run test:ui
```

**Status**: ✅ Ready to run

---

## 2. 🎭 E2E Tests (Playwright)

### Setup

```bash
cd apps/buyer
npm install --save-dev @playwright/test
npx playwright install
```

### Run Commands

```bash
# All E2E tests
npx playwright test

# Specific test file
npx playwright test e2e/tests/security.e2e.spec.js

# With UI
npx playwright test --ui

# Debug mode
npx playwright test --debug

# Headed mode (see browser)
npx playwright test --headed

# Specific browser
npx playwright test --project=chromium
```

### Test Files

- `e2e/tests/security.e2e.spec.js` - Security E2E tests
- `e2e/tests/paymentFlow.e2e.spec.js` - Payment flow
- `e2e/tests/authFlow.e2e.spec.js` - Authentication flow

**Status**: ✅ Created, needs Playwright installation

---

## 3. 🔌 API Tests (Postman/Newman)

### Setup

```bash
# Install Newman (Postman CLI)
npm install -g newman

# Or use Postman Desktop App
# Download from: https://www.postman.com/downloads/
```

### Run Commands

```bash
# Using Newman (CLI)
newman run api-tests/postman/Ojawa_ECommerce_API.postman_collection.json

# With environment
newman run api-tests/postman/Ojawa_ECommerce_API.postman_collection.json \
  -e api-tests/postman/environment.json

# With HTML report
newman run api-tests/postman/Ojawa_ECommerce_API.postman_collection.json \
  --reporters html \
  --reporter-html-export api-tests/results/report.html

# Using Postman Desktop
# 1. Open Postman
# 2. Import: api-tests/postman/Ojawa_ECommerce_API.postman_collection.json
# 3. Click "Run" button
```

### Collection File

- `api-tests/postman/Ojawa_ECommerce_API.postman_collection.json`

**Status**: ✅ Created, ready to import

---

## 4. ⚡ Performance Tests

### Lighthouse

```bash
# Install
npm install -g lighthouse

# Run audit
lighthouse https://ojawa-ecommerce.web.app \
  --config-path=performance-tests/lighthouse.config.js \
  --output=html \
  --output-path=performance-tests/results/lighthouse-report.html

# CI mode (JSON output)
lighthouse https://ojawa-ecommerce.web.app \
  --config-path=performance-tests/lighthouse.config.js \
  --output=json \
  --output-path=performance-tests/results/lighthouse-report.json \
  --chrome-flags="--headless"
```

### Load Testing (k6)

```bash
# Install k6
# Windows: choco install k6
# Or download: https://k6.io/docs/getting-started/installation/

# Run load test
k6 run performance-tests/load-test.js

# Custom URL
k6 run --env BASE_URL=https://ojawa-ecommerce.web.app performance-tests/load-test.js

# Custom load
k6 run --vus 100 --duration 10m performance-tests/load-test.js
```

**Status**: ✅ Configs created, needs tools installed

---

## 5. 🔒 Security Scanning (OWASP ZAP)

### Setup

```bash
# Option 1: Download ZAP Desktop
# https://www.zaproxy.org/download/

# Option 2: Use Docker
docker pull owasp/zap2docker-stable
```

### Run Commands

```bash
# Using script (Linux/Mac)
chmod +x security-tests/owasp-zap-scan.sh
./security-tests/owasp-zap-scan.sh https://ojawa-ecommerce.web.app

# Using Docker
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://ojawa-ecommerce.web.app \
  -J security-tests/zap-reports/report.json \
  -r security-tests/zap-reports/report.html

# Using ZAP Desktop
# 1. Open ZAP
# 2. Quick Start → Automated Scan
# 3. Enter URL: https://ojawa-ecommerce.web.app
# 4. Click "Attack"
```

**Status**: ✅ Script created, needs ZAP installed

---

## 6. ♿ Accessibility Tests

### Setup

```bash
cd apps/buyer
npm install --save-dev @axe-core/playwright
```

### Run Commands

```bash
# With Playwright
npx playwright test accessibility-tests/axe-core.test.js

# Or add to E2E suite
npx playwright test --grep "accessibility"
```

**Status**: ✅ Created, needs @axe-core/playwright

---

## 7. 📝 Manual Testing

### Checklists

- `manual-tests/MANUAL_TESTING_CHECKLIST.md` - Complete manual test checklist

### Run

1. Open checklist
2. Test each item
3. Mark as complete
4. Document issues

**Status**: ✅ Checklist created

---

## 🚀 Quick Start - Run All Tests

### Step 1: Install All Tools

```bash
# NPM tests (already installed)
cd apps/buyer && npm install

# Playwright
npm install --save-dev @playwright/test
npx playwright install

# Newman
npm install -g newman

# Lighthouse
npm install -g lighthouse

# k6 (download separately)
# https://k6.io/docs/getting-started/installation/

# OWASP ZAP (download separately)
# https://www.zaproxy.org/download/

# axe-core
npm install --save-dev @axe-core/playwright
```

### Step 2: Run Tests

```bash
# 1. NPM tests
cd apps/buyer
npm test

# 2. E2E tests
npx playwright test

# 3. API tests
newman run ../api-tests/postman/Ojawa_ECommerce_API.postman_collection.json

# 4. Performance
lighthouse https://ojawa-ecommerce.web.app --config-path=../performance-tests/lighthouse.config.js

# 5. Load test
k6 run ../performance-tests/load-test.js

# 6. Security scan
../security-tests/owasp-zap-scan.sh https://ojawa-ecommerce.web.app

# 7. Accessibility
npx playwright test ../accessibility-tests/axe-core.test.js
```

---

## 📊 Test Results Location

```
.
├── apps/buyer/
│   └── coverage/              # NPM test coverage
├── e2e/
│   └── test-results/          # Playwright results
├── api-tests/
│   └── results/               # Newman reports
├── performance-tests/
│   └── results/                # Lighthouse & k6 reports
└── security-tests/
    └── zap-reports/           # OWASP ZAP reports
```

---

## 🎯 Recommended Test Schedule

### Every Commit (CI/CD)
- ✅ NPM unit/component tests
- ✅ Security tests (npm)

### Daily
- ✅ E2E tests (critical flows)
- ✅ API tests (smoke tests)

### Weekly
- ✅ Full E2E suite
- ✅ Performance audit (Lighthouse)
- ✅ Accessibility check

### Monthly
- ✅ Security scan (OWASP ZAP)
- ✅ Load testing (k6)
- ✅ Full manual testing

### Before Production
- ✅ All automated tests
- ✅ Full security audit
- ✅ Performance benchmarking
- ✅ Accessibility compliance
- ✅ Manual testing checklist

---

## 📋 Test Execution Checklist

### Automated Tests
- [ ] NPM tests pass
- [ ] E2E tests pass
- [ ] API tests pass
- [ ] Performance acceptable
- [ ] Security scan clean
- [ ] Accessibility compliant

### Manual Tests
- [ ] Security checklist complete
- [ ] Functional checklist complete
- [ ] Browser compatibility verified
- [ ] Mobile responsiveness verified

---

**Last Updated**: November 29, 2024  
**Status**: ✅ **All Test Types Documented and Ready**

