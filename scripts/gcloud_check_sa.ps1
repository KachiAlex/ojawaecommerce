param(
  [string]$ProjectId = "ojawa-ecommerce"
)

Write-Host "Checking for gcloud CLI..."
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  Write-Host "gcloud CLI not found. Install Cloud SDK: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
  exit 2
}

Write-Host "Project: $ProjectId"
$projNum = (& gcloud projects describe $ProjectId --format='value(projectNumber)') 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to get project number:" $projNum -ForegroundColor Red
  exit 3
}
Write-Host "Project number: $projNum"

$defaultSA = "$projNum@cloudbuild.gserviceaccount.com"
Write-Host "Checking for default Cloud Build service account: $defaultSA"

$saListRaw = (& gcloud iam service-accounts list --project $ProjectId --format='value(email)') 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to list service accounts:" $saListRaw -ForegroundColor Red
  exit 4
}

if ($saListRaw -match [regex]::Escape($defaultSA)) {
  Write-Host "Default Cloud Build service account exists:" $defaultSA -ForegroundColor Green
} else {
  Write-Host "Default Cloud Build service account NOT FOUND." -ForegroundColor Yellow
  Write-Host "If you have enabled Cloud Build API, the default SA should be: $defaultSA" -ForegroundColor Yellow
}

Write-Host "
All service accounts in project:"
& gcloud iam service-accounts list --project $ProjectId --format='table(email,displayName)'

Write-Host "
If the default SA is missing you can either enable the Cloud Build API (again) or create a dedicated service account using the helper script: .\scripts\create_cloud_build_sa.ps1"
