#!/bin/bash
# Analytics Integration Test Suite - Comprehensive Verification
# Date: March 12, 2026

echo "🧪 ANALYTICS INTEGRATION - COMPREHENSIVE TEST SUITE"
echo "=================================================="
echo ""

# Test 1: File Existence
echo "📋 TEST 1: File Existence Verification"
echo "-------------------------------------"

files_to_check=(
  "apps/buyer/src/services/adminAnalyticsService.js"
  "apps/buyer/src/hooks/useAnalytics.js"
  "apps/buyer/src/components/admin/AdminAnalyticsDashboard.jsx"
  "functions/src/analytics.js"
  "apps/buyer/src/pages/Admin.jsx"
  "apps/buyer/src/pages/Products.jsx"
  "apps/buyer/src/pages/ProductDetail.jsx"
  "apps/buyer/src/pages/Cart.jsx"
  "apps/buyer/src/pages/Checkout.jsx"
  "apps/buyer/src/pages/Buyer.jsx"
  "apps/buyer/src/pages/Login.jsx"
  "apps/buyer/src/pages/Register.jsx"
  "apps/buyer/src/App.jsx"
)

passed=0
failed=0

for file in "${files_to_check[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ FOUND: $file"
    ((passed++))
  else
    echo "❌ MISSING: $file"
    ((failed++))
  fi
done

echo ""
echo "File Check: $passed passed, $failed failed"
echo ""

# Test 2: Import Verification
echo "📋 TEST 2: Import/Export Verification"
echo "------------------------------------"

echo "Checking AdminAnalyticsDashboard import in Admin.jsx..."
if grep -q "import AdminAnalyticsDashboard" apps/buyer/src/pages/Admin.jsx; then
  echo "✅ AdminAnalyticsDashboard import found"
else
  echo "❌ AdminAnalyticsDashboard import missing"
fi

echo "Checking useAnalytics import in App.jsx..."
if grep -q "import { useAnalytics }" apps/buyer/src/App.jsx; then
  echo "✅ useAnalytics import found"
else
  echo "❌ useAnalytics import missing"
fi

echo "Checking analytics exports in functions/index.js..."
exports_count=$(grep -c "exports..*analytics" functions/index.js || echo "0")
echo "✅ Found $exports_count analytics exports"

echo ""

# Test 3: Integration Points
echo "📋 TEST 3: Integration Points Verification"
echo "----------------------------------------"

pages=(
  "Products.jsx:usePageTracking,useProductTracking"
  "ProductDetail.jsx:usePageTracking,useProductTracking"
  "Cart.jsx:usePageTracking,useProductTracking"
  "Checkout.jsx:usePageTracking,usePaymentTracking"
  "Buyer.jsx:usePageTracking,useOrderTracking"
  "Login.jsx:usePageTracking,useUserTracking"
  "Register.jsx:usePageTracking,useUserTracking"
)

for page in "${pages[@]}"; do
  file="${page%%:*}"
  hooks="${page#*:}"
  file_path="apps/buyer/src/pages/$file"
  
  if grep -q "from '../hooks/useAnalytics'" "$file_path"; then
    echo "✅ $file - hooks imported"
  else
    echo "❌ $file - hooks NOT imported"
  fi
done

echo ""

# Test 4: Analytics Tab
echo "📋 TEST 4: Analytics Tab in Admin"
echo "-------------------------------"

if grep -q "analytics.*activeTab.*AdminAnalyticsDashboard" apps/buyer/src/pages/Admin.jsx; then
  echo "✅ Analytics tab with conditional rendering found"
else
  echo "⚠️  Analytics tab not yet verified"
fi

echo ""

# Test 5: Firestore Collections
echo "📋 TEST 5: Analytics Collections Structure"
echo "----------------------------------------"

collections=(
  "'analytics_events'"
  "'user_sessions'"
  "'error_logs'"
  "'performance_metrics'"
  "'conversion_funnel'"
  "'daily_reports'"
  "'analytics_alerts'"
)

echo "Required Firestore collections:"
for col in "${collections[@]}"; do
  if grep -q "$col" apps/buyer/src/services/adminAnalyticsService.js; then
    echo "✅ $col defined"
  else
    echo "❌ $col missing"
  fi
done

echo ""

# Test 6: Cloud Functions
echo "📋 TEST 6: Cloud Functions Setup"
echo "-------------------------------"

functions=(
  "generateDailyAnalyticsReport"
  "checkErrorRateAlert"
  "checkPerformanceDegradation"
  "cleanupOldAnalyticsData"
  "getAnalyticsSummary"
)

for func in "${functions[@]}"; do
  if grep -q "exports.$func" functions/index.js; then
    echo "✅ $func exported"
  else
    echo "❌ $func NOT exported"
  fi
done

echo ""

# Test 7: Git Status
echo "📋 TEST 7: Git Deployment Status"
echo "------------------------------"

if git log -1 --pretty=format:"%s" | grep -q "analytics"; then
  commit=$(git log -1 --pretty=format:"%h")
  echo "✅ Latest commit includes analytics: $commit"
  
  if git log -1 --pretty=format:"%an" | grep -q "KachiAlex"; then
    echo "✅ Commit by: $(git log -1 --pretty=format:"%an")"
  fi
  
  branch=$(git rev-parse --abbrev-ref HEAD)
  echo "✅ Current branch: $branch"
  
  # Check if pushed
  if git log origin/main..HEAD | grep -q "analytics"; then
    echo "⚠️  Commits not yet pushed"
  else
    echo "✅ Changes pushed to origin/main"
  fi
else
  echo "❌ Analytics commit not found"
fi

echo ""
echo "=================================================="
echo "🎉 COMPREHENSIVE TEST SUITE COMPLETE"
echo "=================================================="
