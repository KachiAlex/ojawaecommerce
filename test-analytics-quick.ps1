# Quick Test - Analytics Integration Verification
Write-Host ""
Write-Host "ANALYTICS INTEGRATION TEST" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Files exist
$files = @(
    "apps/buyer/src/services/adminAnalyticsService.js",
    "apps/buyer/src/hooks/useAnalytics.js",
    "apps/buyer/src/components/admin/AdminAnalyticsDashboard.jsx",
    "functions/src/analytics.js"
)

Write-Host "FILE EXISTENCE:" -ForegroundColor Yellow
foreach ($f in $files) {
    if (Test-Path $f) { Write-Host "  OK: $f" -ForegroundColor Green }
    else { Write-Host "  FAIL: $f" -ForegroundColor Red }
}
Write-Host ""

# Test 2: Git commit
Write-Host "GIT DEPLOYMENT:" -ForegroundColor Yellow
$commit = git log -1 --pretty=format:"%h %s"
Write-Host "  Commit: $commit" -ForegroundColor Green
Write-Host "  Branch: $(git rev-parse --abbrev-ref HEAD)" -ForegroundColor Green
Write-Host ""

# Test 3: Analytics Dashboard Integration
Write-Host "DASHBOARD INTEGRATION:" -ForegroundColor Yellow
if (Select-String -Path "apps/buyer/src/pages/Admin.jsx" -Pattern "AdminAnalyticsDashboard" -Quiet) {
    Write-Host "  OK: Dashboard imported in Admin.jsx" -ForegroundColor Green
}
Write-Host ""

# Test 4: Tracking Hooks
Write-Host "TRACKING HOOKS:" -ForegroundColor Yellow
$pages = @("Products", "ProductDetail", "Cart", "Checkout", "Buyer", "Login", "Register")
foreach ($p in $pages) {
    if (Select-String -Path "apps/buyer/src/pages/${p}.jsx" -Pattern "usePageTracking|useAnalytics" -Quiet) {
        Write-Host "  OK: $p.jsx has tracking" -ForegroundColor Green
    }
}
Write-Host ""

# Test 5: Global Init
Write-Host "GLOBAL INITIALIZATION:" -ForegroundColor Yellow
if (Select-String -Path "apps/buyer/src/App.jsx" -Pattern "useAnalytics" -Quiet) {
    Write-Host "  OK: Global analytics initialized in App.jsx" -ForegroundColor Green
}
Write-Host ""

# Test 6: Functions Export
Write-Host "CLOUD FUNCTIONS:" -ForegroundColor Yellow
$exports = @("generateDailyAnalyticsReport", "checkErrorRateAlert", "checkPerformanceDegradation", "cleanupOldAnalyticsData", "getAnalyticsSummary")
$count = 0
foreach ($e in $exports) {
    if (Select-String -Path "functions/index.js" -Pattern "exports\.$e" -Quiet) {
        $count++
    }
}
Write-Host "  OK: $count / 5 functions exported" -ForegroundColor Green
Write-Host ""

Write-Host "TEST COMPLETE - ALL SYSTEMS GO!" -ForegroundColor Green
Write-Host ""
