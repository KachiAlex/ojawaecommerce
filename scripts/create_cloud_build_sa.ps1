param(
  [string]$ProjectId = "ojawa-ecommerce",
  [string]$SaName = "cloud-build-sa"
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

$saEmail = "$SaName@$ProjectId.iam.gserviceaccount.com"
Write-Host "Creating service account: $saEmail"

# Check if it already exists
$exists = (& gcloud iam service-accounts list --project $ProjectId --format='value(email)' | Select-String -Pattern ([regex]::Escape($saEmail)))
if ($exists) {
  Write-Host "Service account already exists: $saEmail" -ForegroundColor Yellow
} else {
  & gcloud iam service-accounts create $SaName --display-name="Cloud Build Service Account" --project $ProjectId
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create service account." -ForegroundColor Red
    exit 4
  }
  Write-Host "Service account created: $saEmail" -ForegroundColor Green
}

Write-Host "Granting roles to $saEmail"
& gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$saEmail" --role="roles/cloudfunctions.admin"
& gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$saEmail" --role="roles/iam.serviceAccountUser"
& gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$saEmail" --role="roles/cloudbuild.builds.editor"

Write-Host "Roles granted. You can now configure Cloud Build trigger to use this service account (Advanced → Service account)."
