# 🐳 Building Android APK with Docker

Complete guide for building the Ojawa Android APK using Docker without requiring Android Studio or Java locally.

---

## ✅ Prerequisites

### Required
- **Docker Desktop** (version 20.10+)
  - Download: https://www.docker.com/products/docker-desktop
  - Windows: Install with WSL 2 backend recommended
  - Mac: Universal or Intel depending on your chip
  - Linux: Install docker and docker-compose

## 📦 Tools Pre-configured

The Docker image includes:
- ✅ Java 21 JDK (required for Capacitor Android)
- ✅ Android SDK (API 35, with build tools)
- ✅ Node.js 22 LTS
- ✅ Gradle 8.7.2
- ✅ Git

---

## 🚀 Quick Start

### Windows (PowerShell)

**Run this one command:**
```powershell
cd d:\ojawaecommerce-main
.\build-android-apk.ps1
```

**With options:**
```powershell
# Build release APK (default)
.\build-android-apk.ps1 -BuildType release

# Build debug APK (faster)
.\build-android-apk.ps1 -BuildType debug

# Force rebuild without cache
.\build-android-apk.ps1 -NoCache
```

### macOS / Linux

**Make script executable:**
```bash
chmod +x build-android-apk.sh
```

**Run the build:**
```bash
./build-android-apk.sh
```

**With options:**
```bash
# Build release (default)
./build-android-apk.sh release

# Build debug (faster)
./build-android-apk.sh debug

# Force rebuild
./build-android-apk.sh release --no-cache
```

---

## 🔧 Using Docker Compose

### Windows & macOS / Linux

```bash
# Build the Docker image
docker-compose -f docker-compose.android.yml build

# Run the build
docker-compose -f docker-compose.android.yml run android-builder

# Clean up
docker-compose -f docker-compose.android.yml down
```

---

## 📋 Build Process Overview

```
┌─────────────────────────────────────────────────┐
│  Step 1: Build React Web App                    │
│  - Install Node dependencies                    │
│  - Run: npm run build                           │
│  - Output: dist/ folder                         │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  Step 2: Setup Android Build Environment        │
│  - Install Android SDK                          │
│  - Configure Java 21                            │
│  - Setup Gradle                                 │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  Step 3: Sync Web Assets with Capacitor         │
│  - Copy web files to Android assets             │
│  - Update configuration                         │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  Step 4: Build Android APK                      │
│  - Run: gradlew assembleRelease                 │
│  - Sign with release key                        │
│  - Output: ojawa-release-*.apk                  │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  ✅ Complete: APK ready in build-artifacts/     │
└─────────────────────────────────────────────────┘
```

---

## 📁 Output Location

After successful build, your APK will be in:

```
build-artifacts/
├── ojawa-release-1.4.apk          (Main release APK)
├── ojawa-release-unsigned-1.4.apk (Unsigned, for testing)
└── app-release.apk                (Alternative naming)
```

**Full path:** `d:\ojawaecommerce-main\build-artifacts\`

---

## 🔑 Signing Configuration

### Current Setup
The app is configured to auto-sign with release keys if `keystore.properties` exists.

### Create Signing Key (First Time Only)

**Windows (PowerShell):**
```powershell
cd d:\ojawaecommerce-main\apps\buyer\android

# Generate keystore
keytool -genkey -v `
  -keystore ojawa-release-key.jks `
  -keyalg RSA -keysize 2048 `
  -validity 10000 `
  -alias ojawa

# Create keystore.properties
@"
storeFile=ojawa-release-key.jks
storePassword=your-store-password
keyAlias=ojawa
keyPassword=your-key-password
"@ | Out-File -Encoding UTF8 keystore.properties
```

**macOS / Linux:**
```bash
cd apps/buyer/android

# Generate keystore
keytool -genkey -v \
  -keystore ojawa-release-key.jks \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -alias ojawa

# Create keystore.properties
cat > keystore.properties << EOF
storeFile=ojawa-release-key.jks
storePassword=your-store-password
keyAlias=ojawa
keyPassword=your-key-password
EOF
```

---

## 🧪 Testing the APK

### Option 1: Android Emulator (Recommended for testing)

1. **Install Android Studio:** https://developer.android.com/studio
2. **Create Virtual Device:**
   - Open Android Studio
   - Tools → Device Manager → Create New Device
   - Select Pixel 4 (or similar)
   - Choose Android 15 (API 35)
3. **Install APK:**
   ```bash
   adb install -r build-artifacts/ojawa-release-*.apk
   ```

### Option 2: Physical Android Device

1. **Enable Developer Mode:**
   - Go to Settings → About Phone
   - Tap Build Number 7 times
   - Go to Settings → Developer Options
   - Enable USB Debugging

2. **Connect Device via USB:**
   ```bash
   adb devices  # Should show your device
   ```

3. **Install APK:**
   ```bash
   adb install -r build-artifacts/ojawa-release-*.apk
   ```

### Option 3: Manual Installation

1. **Transfer APK to device:**
   - Connect device via USB
   - Copy APK file to device storage
   - Use file manager to locate and tap APK
   - Follow installation prompts

---

## 📊 Build Statistics

| Metric | Value |
|--------|-------|
| Docker Image Size | ~2.5 GB |
| Build Time | 8-15 minutes (first build) |
| Rebuild Time | 2-5 minutes |
| APK Size | ~15-25 MB |
| Supported Android Versions | API 23 (Android 6.0+) |
| Target Android Version | API 35 (Android 15) |
| App Version | 1.4 |
| App ID | com.ojawa.app |

---

## 🔍 Troubleshooting

### Issue: "Docker not found"
```bash
# Solution: Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
```

### Issue: "Build failed: Insufficient disk space"
```bash
# Solution: Free up ~5GB of disk space, then retry
docker system prune -a
```

### Issue: "Gradle daemon error"
The Docker setup uses `--no-daemon` flag automatically, so this shouldn't occur.

### Issue: "APK not found in output"
```bash
# Check Docker build logs:
docker build -f Dockerfile.android -t ojawa-android-builder:latest .

# Look for errors in the output
```

### Issue: "Permission denied: ./gradlew"
This is automatically handled in the Dockerfile with `chmod +x`.

---

## 🔄 Updating the App

### After Making Web Changes:

```bash
# Web changes are already in your code
# Simply rebuild:

./build-android-apk.ps1  # Windows
# or
./build-android-apk.sh   # macOS/Linux

# This will:
# 1. Rebuild the web app
# 2. Sync with Android
# 3. Build new APK with all changes
```

---

## 📈 Build Variants

### Release Build (Default)
```bash
./build-android-apk.ps1 -BuildType release
```
- **Best for:** Production distribution
- **Size:** ~18 MB
- **Performance:** Optimized
- **Time:** 10-15 minutes
- **Signing:** With release key

### Debug Build
```bash
./build-android-apk.ps1 -BuildType debug
```
- **Best for:** Quick testing
- **Size:** ~25 MB
- **Performance:** Not optimized
- **Time:** 3-5 minutes
- **Signing:** Debug key only

---

## 🚀 Production Deployment

### Steps for App Store Submission:

1. **Create Release APK:**
   ```bash
   ./build-android-apk.ps1 -BuildType release
   ```

2. **Verify Signing:**
   ```bash
   jarsigner -verify -verbose build-artifacts/ojawa-release-*.apk
   ```

3. **Generate Bundle (for Google Play):**
   ```bash
   cd apps/buyer/android
   ./gradlew bundleRelease
   ```
   Output: `app/build/outputs/bundle/release/app-release.aab`

4. **Upload to Google Play Console:**
   - Go to: https://play.google.com/console
   - Create app or select existing
   - Upload AAB or APK
   - Fill details and submit for review

---

## 📞 Support & Debugging

### Enable Verbose Build Logging:

**Windows:**
```powershell
$env:GRADLE_OPTS = '-Xmx4096m -Dorg.gradle.logging.level=debug'
.\build-android-apk.ps1
```

**macOS/Linux:**
```bash
export GRADLE_OPTS='-Xmx4096m -Dorg.gradle.logging.level=debug'
./build-android-apk.sh
```

### Check Docker Logs:

```bash
# View build logs from last container
docker logs ojawa-android-builder

# Run interactive troubleshooting
docker run -it ojawa-android-builder:latest /bin/bash
```

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `Dockerfile.android` | Multi-stage Docker build |
| `docker-compose.android.yml` | Docker Compose configuration |
| `build-android-apk.ps1` | Windows PowerShell build script |
| `build-android-apk.sh` | Unix/Linux/macOS build script |
| `apps/buyer/capacitor.config.json` | Capacitor configuration |
| `apps/buyer/android/app/build.gradle` | Android Gradle configuration |

---

## ✅ Verification Checklist

After building, verify:

- [x] Docker image built without errors
- [x] Web app compiled successfully
- [x] Capacitor synced with Android
- [x] APK file exists in `build-artifacts/`
- [x] APK is > 10 MB (not empty)
- [x] APK can be installed on device/emulator
- [x] App launches successfully
- [x] All features work (forms, navigation, etc.)

---

## 🎯 Next Steps

1. **Test on Device:**
   ```bash
   adb install -r build-artifacts/ojawa-release-*.apk
   ```

2. **Monitor Logs:**
   ```bash
   adb logcat | grep "ojawa"
   ```

3. **Submit to Store:**
   - Google Play: Upload AAB to Play Console
   - Other platforms: Use their respective stores

---

*Last Updated: March 16, 2026*  
*Docker Version: 20.10+*  
*Java Version: 21*  
*Android API: 35*
