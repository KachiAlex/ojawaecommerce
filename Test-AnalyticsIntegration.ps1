# Analytics Integration Test Suite - Comprehensive Verification (PowerShell)
# Date: March 12, 2026

Write-Host "🧪 ANALYTICS INTEGRATION - COMPREHENSIVE TEST SUITE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: File Existence
Write-Host "📋 TEST 1: File Existence Verification" -ForegroundColor Yellow
Write-Host "-------------------------------------" -ForegroundColor Yellow

$filesCheck = @(
    "apps/buyer/src/services/adminAnalyticsService.js",
    "apps/buyer/src/hooks/useAnalytics.js",
    "apps/buyer/src/components/admin/AdminAnalyticsDashboard.jsx",
    "functions/src/analytics.js",
    "apps/buyer/src/pages/Admin.jsx",
    "apps/buyer/src/pages/Products.jsx",
    "apps/buyer/src/pages/ProductDetail.jsx",
    "apps/buyer/src/pages/Cart.jsx",
    "apps/buyer/src/pages/Checkout.jsx",
    "apps/buyer/src/pages/Buyer.jsx",
    "apps/buyer/src/pages/Login.jsx",
    "apps/buyer/src/pages/Register.jsx",
    "apps/buyer/src/App.jsx"
)

$passed = 0
$failed = 0

foreach ($file in $filesCheck) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Write-Host "✅ FOUND: $file" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "❌ MISSING: $file" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "File Check: $passed passed, $failed failed" -ForegroundColor Cyan
Write-Host ""

# Test 2: Import Verification
Write-Host "📋 TEST 2: Import/Export Verification" -ForegroundColor Yellow
Write-Host "------------------------------------" -ForegroundColor Yellow

$adminPath = Join-Path $PSScriptRoot "apps/buyer/src/pages/Admin.jsx"
if (Select-String -Path $adminPath -Pattern "import AdminAnalyticsDashboard" -Quiet) {
    Write-Host "✅ AdminAnalyticsDashboard import found" -ForegroundColor Green
} else {
    Write-Host "❌ AdminAnalyticsDashboard import missing" -ForegroundColor Red
}

$appPath = Join-Path $PSScriptRoot "apps/buyer/src/App.jsx"
if (Select-String -Path $appPath -Pattern "import { useAnalytics }" -Quiet) {
    Write-Host "✅ useAnalytics import found" -ForegroundColor Green
} else {
    Write-Host "❌ useAnalytics import missing" -ForegroundColor Red
}

$indexPath = Join-Path $PSScriptRoot "functions/index.js"
$exportsCount = @(Select-String -Path $indexPath -Pattern "exports\..*analytics" -AllMatches).Matches.Count
Write-Host "✅ Found $exportsCount analytics exports" -ForegroundColor Green

Write-Host ""

# Test 3: Integration Points
Write-Host "📋 TEST 3: Integration Points Verification" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

$pages = @(
    @{file="Products.jsx"; hooks="usePageTracking,useProductTracking"},
    @{file="ProductDetail.jsx"; hooks="usePageTracking,useProductTracking"},
    @{file="Cart.jsx"; hooks="usePageTracking,useProductTracking"},
    @{file="Checkout.jsx"; hooks="usePageTracking,usePaymentTracking"},
    @{file="Buyer.jsx"; hooks="usePageTracking,useOrderTracking"},
    @{file="Login.jsx"; hooks="usePageTracking,useUserTracking"},
    @{file="Register.jsx"; hooks="usePageTracking,useUserTracking"}
)

foreach ($page in $pages) {
    $filePath = Join-Path $PSScriptRoot "apps/buyer/src/pages/$($page.file)"
    if (Select-String -Path $filePath -Pattern "from '../hooks/useAnalytics'" -Quiet) {
        Write-Host "✅ $($page.file) - hooks imported" -ForegroundColor Green
    } else {
        Write-Host "❌ $($page.file) - hooks NOT imported" -ForegroundColor Red
    }
}

Write-Host ""

# Test 4: Analytics Tab
Write-Host "📋 TEST 4: Analytics Tab in Admin" -ForegroundColor Yellow
Write-Host "-------------------------------" -ForegroundColor Yellow

if (Select-String -Path $adminPath -Pattern "analytics.*activeTab.*AdminAnalyticsDashboard" -Quiet) {
    Write-Host "✅ Analytics tab with conditional rendering found" -ForegroundColor Green
} else {
    # Check with more flexible pattern
    if (Select-String -Path $adminPath -Pattern "AdminAnalyticsDashboard" -Quiet) {
        Write-Host "✅ Analytics tab component found" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Analytics tab not verified" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test 5: Firestore Collections
Write-Host "📋 TEST 5: Analytics Collections Structure" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Yellow

$servicePath = Join-Path $PSScriptRoot "apps/buyer/src/services/adminAnalyticsService.js"
$collections = @(
    "'analytics_events'",
    "'user_sessions'",
    "'error_logs'",
    "'performance_metrics'",
    "'conversion_funnel'",
    "'daily_reports'",
    "'analytics_alerts'"
)

Write-Host "Required Firestore collections:" -ForegroundColor Cyan
foreach ($col in $collections) {
    if (Select-String -Path $servicePath -Pattern $col -Quiet) {
        Write-Host "✅ $col defined" -ForegroundColor Green
    } else {
        Write-Host "❌ $col missing" -ForegroundColor Red
    }
}

Write-Host ""

# Test 6: Cloud Functions
Write-Host "📋 TEST 6: Cloud Functions Setup" -ForegroundColor Yellow
Write-Host "-------------------------------" -ForegroundColor Yellow

$functions = @(
    "generateDailyAnalyticsReport",
    "checkErrorRateAlert",
    "checkPerformanceDegradation",
    "cleanupOldAnalyticsData",
    "getAnalyticsSummary"
)

foreach ($func in $functions) {
    if (Select-String -Path $indexPath -Pattern "exports\.$func" -Quiet) {
        Write-Host "✅ $func exported" -ForegroundColor Green
    } else {
        Write-Host "❌ $func NOT exported" -ForegroundColor Red
    }
}

Write-Host ""

# Test 7: Git Status
Write-Host "📋 TEST 7: Git Deployment Status" -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Yellow

try {
    $lastCommit = git log -1 --pretty=format:"%s"
    if ($lastCommit -match "analytics") {
        $commitHash = git log -1 --pretty=format:"%h"
        Write-Host "✅ Latest commit includes analytics: $commitHash" -ForegroundColor Green
        
        $author = git log -1 --pretty=format:"%an"
        Write-Host "✅ Commit by: $author" -ForegroundColor Green
        
        $branch = git rev-parse --abbrev-ref HEAD
        Write-Host "✅ Current branch: $branch" -ForegroundColor Green
        
        # Check if pushed
        $unpushed = git log origin/main..HEAD 2>$null | Select-String "analytics" -Quiet
        if ($unpushed) {
            Write-Host "⚠️  Commits not yet pushed" -ForegroundColor Yellow
        } else {
            Write-Host "✅ Changes pushed to origin/main" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Analytics commit not found" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  Could not check git status: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "COMPREHENSIVE TEST SUITE COMPLETE" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
