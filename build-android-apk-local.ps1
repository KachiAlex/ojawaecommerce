# Build Ojawa Android APK Locally (No Docker)
# This script uses local Java 21 and Gradle to build the APK

param(
    [ValidateSet('debug', 'release')]
    [string]$BuildType = 'release'
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

Write-Info "Starting local Android APK build (No Docker)..."

# Check Java is installed
Write-Info "Checking Java 21..."
try {
    $javaVersion = java -version 2>&1
    if ($javaVersion -match "21") {
        Write-Success "Java 21 found: $($javaVersion[0])"
    } else {
        Write-ErrorMsg "Wrong Java version. Found: $($javaVersion[0])"
        exit 1
    }
} catch {
    Write-ErrorMsg "Java not found"
    exit 1
}

# Check if we're in the right directory
if (!(Test-Path "apps/buyer/package.json")) {
    Write-ErrorMsg "Not in project root. Please run from: d:\ojawaecommerce-main"
    exit 1
}

Write-Info "Step 1: Building React web app..."
cd apps/buyer
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Web app build failed"
    exit 1
}
Write-Success "Web app built successfully"

Write-Info "Step 2: Syncing with Capacitor Android..."
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Capacitor sync failed"
    exit 1
}
Write-Success "Capacitor sync complete"

Write-Info "Step 3: Building Android APK (this may take 5-10 minutes)..."
cd android

# Set memory for Gradle
$env:GRADLE_OPTS = '-Xmx4096m'

# Clean and build
.\gradlew.bat clean
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Gradle clean failed"
    exit 1
}

Write-Info "Running gradlew assembleRelease..."
.\gradlew.bat assembleRelease --no-daemon

if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "APK build failed"
    exit 1
}

Write-Success "APK build successful!"

# Check for output
$outputDir = "app/build/outputs/apk/release"
if (Test-Path $outputDir) {
    Write-Info "APK files:"
    Get-ChildItem -Path $outputDir -Filter "*.apk" | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Success "  - $($_.Name) ($size MB)"
        Write-Success "    Full path: $($_.FullName)"
    }
} else {
    Write-ErrorMsg "Output directory not found"
    exit 1
}

Write-Success "`nBuild complete!"
Write-Info "Next steps:"
Write-Info "  1. Copy APK to device or emulator"
Write-Info "  2. Install: adb install -r app/build/outputs/apk/release/*.apk"
Write-Info "  3. Test on device"

exit 0
