# 🚀 Docker Android APK Build - Quick Start Guide

## 🐳 Docker Desktop Not Running

**The build requires Docker Desktop to be running.**

### How to Start Docker Desktop on Windows:

**Option 1: Click to Start (Easiest)**
1. Press `Win + ⊞` (Windows key)
2. Type: `Docker Desktop`
3. Click on "Docker Desktop" app
4. Wait for it to start (you'll see Docker icon in system tray)
5. It typically takes 30-60 seconds to fully start

**Option 2: Command Line**
```powershell
# In PowerShell (as Administrator):
& 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
```

**Option 3: Windows Services**
1. Right-click Start menu → Tasks
2. Type: Services → Open Services
3. Find "Docker Desktop Service"
4. Right-click → Start

### Verify Docker is Running:

```powershell
docker ps
```

Should return something like:
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

---

## ✅ After Docker is Running

Once Docker is running, execute:

```powershell
cd d:\ojawaecommerce-main
.\build-android-apk.ps1 -BuildType release
```

**Expected process:**
1. Docker builds the image (~3-5 min for first build)
2. Web app compiles  
3. Android project syncs
4. APK builds (~10-15 min)
5. APK saved to: `build-artifacts/`

**Total time: 15-25 minutes for first build**

---

## 💾 Disk Space Check

Android builds need 5-10 GB free space:

```powershell
# Check free space
Get-Volume | Select-Object DriveLetter, Size, SizeRemaining
```

If you need to free space:
```powershell
# Clean Docker system
docker system prune -a

# This frees several GB
```

---

## 🎯 Once Docker Starts

Look for Docker icon in system tray (bottom-right corner). When it shows:
- ✅ **Solid icon** = Docker is running
- ❌ **Faded icon** = Docker is starting

Then run the build:

```powershell
.\build-android-apk.ps1 -BuildType release
```

---

## 📝 Troubleshooting

**Docker won't start:**
- Check Windows Subsystem for Linux (WSL 2) is enabled
- In PowerShell: `wsl --list --verbose`
- Should show WSL 2 with Ubuntu

**Still getting API error:**
```powershell
# Restart Docker daemon
net stop com.docker.service
net start com.docker.service
```

**Windows Firewall blocking:**
- Check if Docker is allowed through Firewall
- Settings → Firewall & Network Protection → Allow apps through firewall
- Look for Docker Desktop

---

## ⚡ Alternative: Build Without Docker (Local Java 21 Only)

If you have Java 21 installed:

```powershell
cd d:\ojawaecommerce-main\apps\buyer

# Build web first
npm run build

# Sync with Android
npx cap sync android

# Build APK
cd android
./gradlew.bat assembleRelease

# Output: app/build/outputs/apk/release/app-release-unsigned.apk
```

---

Next: Start Docker Desktop and run the build script! 🚀
