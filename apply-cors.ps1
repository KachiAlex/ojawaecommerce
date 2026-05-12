# PowerShell script to apply CORS configuration to Firebase Storage bucket
# This requires gsutil to be installed and authenticated

$BUCKET_NAME = "ojawa-ecommerce.firebasestorage.app"

Write-Host "Applying CORS configuration to Firebase Storage bucket: $BUCKET_NAME" -ForegroundColor Cyan
Write-Host ""

# Check if gsutil is installed
$gsutilPath = Get-Command gsutil -ErrorAction SilentlyContinue
if (-not $gsutilPath) {
    Write-Host "❌ Error: gsutil is not installed." -ForegroundColor Red
    Write-Host "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Apply CORS configuration
Write-Host "Applying CORS configuration..." -ForegroundColor Yellow
& gsutil cors set cors.json "gs://$BUCKET_NAME"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ CORS configuration applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifying CORS configuration:" -ForegroundColor Cyan
    & gsutil cors get "gs://$BUCKET_NAME"
} else {
    Write-Host "❌ Error: Failed to apply CORS configuration" -ForegroundColor Red
    exit 1
}

