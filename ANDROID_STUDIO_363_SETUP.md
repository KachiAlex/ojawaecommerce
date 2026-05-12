# 📱 Building APK with Android Studio 3.6.3

## ✅ Project Configured for Android Studio 3.6.3

I've adjusted your project to be compatible with Android Studio 3.6.3:

- ✅ Gradle downgraded to 6.3 (compatible with AS 3.6.3)
- ✅ Android Gradle Plugin downgraded to 3.6.4
- ✅ Android SDK set to 29 (Android 10) - compatible with AS 3.6.3
- ✅ Java version set to Java 8 (compatible with AS 3.6.3)
- ✅ Manifest package configured

---

## 🚀 Build Steps

### **Step 1: Open Project in Android Studio 3.6.3**

1. Open Android Studio 3.6.3
2. Click **File → Open**
3. Navigate to: `apps/buyer/android`
4. Click **OK**
5. Wait for Gradle sync (first time may take 5-10 minutes)

### **Step 2: Install Required SDK Components**

Android Studio will prompt you, or manually install:

1. **Tools → SDK Manager**
2. Install:
   - **Android SDK Platform 29** (Android 10)
   - **Android SDK Build-Tools 29.x**
   - **Android SDK Platform-Tools**

### **Step 3: Build APK**

#### **Option A: Debug APK (For Testing)**
1. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for build to complete
3. Click **locate** when notification appears
4. APK location: `app/build/outputs/apk/debug/app-debug.apk`

#### **Option B: Release APK (For Distribution)**
1. Go to **Build → Generate Signed Bundle / APK**
2. Select **APK** and click **Next**
3. **Create new keystore** (or use existing):
   - Key store path: Choose location
   - Password: Create strong password
   - Alias: `ojawa`
   - Key password: Create password
   - Validity: 25 years
   - Click **OK**
4. Click **Next**
5. Select **release** build variant
6. Click **Finish**
7. APK location: `app/build/outputs/apk/release/app-release.apk`

---

## ⚙️ Project Configuration

- **App ID:** `com.ojawa.app`
- **App Name:** Ojawa
- **Min SDK:** 23 (Android 6.0)
- **Target SDK:** 29 (Android 10)
- **Gradle:** 6.3
- **Java:** 8 (1.8)

---

## 🔧 Troubleshooting

### **Gradle Sync Fails:**
1. **File → Invalidate Caches / Restart**
2. Clean project: **Build → Clean Project**
3. Try sync again

### **Build Errors:**
- Make sure Android SDK 29 is installed
- Check Java version (should be 8 or 11)
- Clean and rebuild: **Build → Clean Project**, then **Build → Rebuild Project**

### **"SDK location not found":**
1. **File → Project Structure**
2. Set SDK location (usually: `C:\Users\YourName\AppData\Local\Android\Sdk`)
3. Click **OK**

### **"Minimum supported Gradle version":**
- The project is already configured for Gradle 6.3
- If error persists, try: **File → Settings → Build → Gradle** and set "Gradle distribution" to "Gradle wrapper"

---

## 📱 Testing APK

### **Install on Device:**
1. Enable **Developer Options** on your Android device
2. Enable **USB Debugging**
3. Connect device via USB
4. In Android Studio: **Run → Run 'app'**
5. Or manually: Transfer APK to device and install

### **Test on Emulator:**
1. **Tools → AVD Manager**
2. **Create Virtual Device**
3. Select device (e.g., Pixel 4)
4. Select system image (Android 10 / API 29)
5. Click **Finish**
6. **Run → Run 'app'**

---

## 🔄 After Web Changes

When you update your web app:

```bash
cd apps/buyer
npm run build
npx cap sync android
```

Then rebuild in Android Studio.

---

## 📝 Notes

- **Android Studio 3.6.3** is an older version (2020)
- Works with **Android SDK 29** (Android 10)
- Uses **Gradle 6.3** and **Java 8**
- Project is fully configured and ready to build
- For newer Android features, consider updating to Android Studio Arctic Fox (2021) or newer

---

## 🎯 Quick Build Checklist

- [ ] Android Studio 3.6.3 installed
- [ ] Project opened: `apps/buyer/android`
- [ ] Gradle sync completed successfully
- [ ] Android SDK 29 installed
- [ ] Build → Build APK(s)
- [ ] APK generated successfully

---

*Your project is now configured for Android Studio 3.6.3! Open the project and build your APK.*

