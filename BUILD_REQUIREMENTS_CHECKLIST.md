# ✅ Android APK Build Requirements Checklist

## 🔧 What You Need for a Successful Build

### **1. Java Development Kit (JDK)**
- ✅ **Current:** Java 17 (openjdk 17.0.16) - **GOOD**
- **Requirement:** Java 17 or Java 11
- **Check:** `java -version` should show Java 11 or 17
- ✅ **Status:** You have Java 17 - Ready!

### **2. Android SDK**
**Required Components:**
- ✅ Android SDK Platform 33 (Android 13)
- ✅ Android SDK Build-Tools (any 33.x version)
- ✅ Android SDK Platform-Tools
- ✅ Android SDK Command-line Tools

**How to Check/Install:**
1. Open Android Studio 3.6.3
2. **Tools → SDK Manager**
3. Install:
   - **Android SDK Platform 33**
   - **Android SDK Build-Tools** (latest 33.x)
   - **SDK Platform-Tools**

**Or via command line (if SDK path is set):**
```powershell
# Check SDK location
echo $env:ANDROID_HOME
# Should show something like: C:\Users\YourName\AppData\Local\Android\Sdk
```

### **3. Internet Connection**
- ✅ **Stable internet** required for downloading dependencies
- ⚠️ **If behind proxy/firewall:** May need to configure Gradle proxy
- ⚠️ **Current Issue:** "Tag mismatch" suggests corrupted downloads

### **4. Gradle Cache (Current Problem)**
**Issue:** "Tag mismatch!" errors = corrupted Gradle cache

**FIX NEEDED:** Clear Gradle cache
```powershell
# Clear Gradle cache
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\wrapper" -ErrorAction SilentlyContinue
```

### **5. Disk Space**
- **Requirement:** At least 2-3 GB free space
- For Gradle downloads and build artifacts

---

## 🛠️ Step-by-Step Fix Procedure

### **Step 1: Clear Gradle Cache (CRITICAL)**
Run these commands to fix "Tag mismatch" errors:

```powershell
# Stop all Gradle processes
taskkill /F /IM java.exe

# Clear Gradle cache
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\wrapper" -ErrorAction SilentlyContinue

# Wait a few seconds
Start-Sleep -Seconds 3
```

### **Step 2: Verify Android SDK**
Make sure Android SDK 33 is installed in Android Studio.

### **Step 3: Build in Android Studio (RECOMMENDED)**

**Why Android Studio is Better:**
- Handles dependency downloads automatically
- Manages cache better
- Provides better error messages
- Handles proxy/network issues

**Steps:**
1. Open Android Studio 3.6.3
2. **File → Open** → Select `apps/buyer/android`
3. Wait for Gradle sync (will download fresh dependencies)
4. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. Done! APK in `app/build/outputs/apk/debug/`

---

## 🔍 Verification Checklist

Run these checks before building:

### **✅ Java Version:**
```powershell
java -version
# Should show: openjdk version "17.x.x" or "11.x.x"
```

### **✅ Android SDK Path:**
```powershell
echo $env:ANDROID_HOME
# Should show path like: C:\Users\YourName\AppData\Local\Android\Sdk
```

**If not set:**
1. Get SDK path from Android Studio: **File → Project Structure → SDK Location**
2. Set environment variable (optional, Android Studio handles this)

### **✅ Gradle Version:**
```powershell
cd apps/buyer/android
.\gradlew.bat --version
# Should download and show Gradle 7.5
```

### **✅ Internet Connection:**
- Test: Can you access https://services.gradle.org?
- Test: Can you access https://dl.google.com?

---

## 🌐 Network/Proxy Configuration (If Needed)

If behind corporate firewall/proxy, add to `gradle.properties`:

```properties
systemProp.http.proxyHost=proxy.example.com
systemProp.http.proxyPort=8080
systemProp.https.proxyHost=proxy.example.com
systemProp.https.proxyPort=8080
```

---

## 📦 Quick Fix: Use Android Studio

**Easiest Solution:** Build directly in Android Studio 3.6.3

1. **Open:** `apps/buyer/android` in Android Studio
2. **Wait:** Let Gradle sync (downloads dependencies fresh)
3. **Build:** Build → Build APK(s)
4. **Done:** APK ready!

**Why this works better:**
- Android Studio manages Gradle downloads
- Clears cache automatically when needed
- Better error handling
- No command-line cache issues

---

## ❌ Common Issues & Solutions

### **Issue: "Tag mismatch!" errors**
**Solution:** Clear Gradle cache (see Step 1 above)

### **Issue: "SDK location not found"**
**Solution:**
1. Android Studio → File → Project Structure
2. Set SDK location
3. Android Studio will handle it automatically

### **Issue: "Gradle sync failed"**
**Solution:**
1. File → Invalidate Caches / Restart
2. Build → Clean Project
3. Try sync again

### **Issue: "Java version mismatch"**
**Solution:** You have Java 17 - perfect! No change needed.

---

## ✅ Final Checklist Before Build

- [ ] Java 17 installed ✅ (You have this)
- [ ] Android Studio 3.6.3 installed ✅ (You have this)
- [ ] Android SDK 33 installed (Check in SDK Manager)
- [ ] Gradle cache cleared (Run commands above)
- [ ] Internet connection stable
- [ ] Disk space available (>2GB)
- [ ] Project opened in Android Studio
- [ ] Gradle sync completed successfully

---

## 🚀 Recommended Build Method

**Best Option: Build in Android Studio 3.6.3**

1. Clear Gradle cache first (fixes "Tag mismatch")
2. Open project in Android Studio
3. Let it sync (downloads fresh dependencies)
4. Build APK

This avoids all command-line cache issues!

---

*Follow this checklist to ensure your build works!*

