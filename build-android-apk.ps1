# Build Ojawa Android APK using Docker
# This script builds the React web app and Android APK in Docker

param(
    [ValidateSet('debug', 'release')]
    [string]$BuildType = 'release',
    [switch]$NoCache
)

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}
# Check if Docker is installed
Write-Info "Checking Docker installation..."
try {
    $dockerVersion = docker --version
    Write-Success "Docker found: $dockerVersion"
} catch {
    Write-ErrorMsg "Docker not found. Please install Docker Desktop."
    exit 1
}

# Get workspace root and create output dir
$workspaceRoot = Get-Location
Write-Info "Workspace root: $workspaceRoot"

$outputDir = Join-Path $workspaceRoot "build-artifacts"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
    Write-Info "Created output directory: $outputDir"
}

# Build Docker image
Write-Info "Building Docker image..."
$cacheFlag = if ($NoCache) { '--no-cache' } else { '' }
$buildCmd = "docker build -f Dockerfile.android -t ojawa-android-builder:latest $cacheFlag ."
Write-Info "Running: $buildCmd"
Invoke-Expression $buildCmd

if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Docker build failed"
    exit 1
}

Write-Success "Docker image built successfully"

# Run Docker container
Write-Info "Starting Docker container to build APK..."
Write-Info "Build type: $BuildType"
Write-Info "Output directory: $outputDir"

$volumeMount = "$outputDir`:/output"
$containerCmd = "docker run --rm -v $volumeMount -e BUILD_VARIANT=$BuildType -e GRADLE_OPTS='-Xmx4096m' ojawa-android-builder:latest"
Write-Info "Running container..."
Invoke-Expression $containerCmd

if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Build failed inside container"
    exit 1
}

# Check if APK was created
Write-Info "Checking for generated APKs..."
$apkFiles = @(Get-ChildItem -Path "$outputDir" -Filter "*.apk" -ErrorAction SilentlyContinue)

if ($apkFiles.Count -gt 0) {
    Write-Success "APKs generated successfully:"
    foreach ($apk in $apkFiles) {
        $size = [math]::Round($apk.Length / 1MB, 2)
        Write-Success "  - $($apk.Name) ($size MB)"
    }
} else {
    Write-ErrorMsg "No APK files found in output directory"
}

Write-Success "Build process completed!"
Write-Info "Output location: $outputDir"
Write-Info "Next steps:"
Write-Info "  1. Install: adb install -r $outputDir\*.apk"
Write-Info "  2. Test on device or emulator"

exit 0
