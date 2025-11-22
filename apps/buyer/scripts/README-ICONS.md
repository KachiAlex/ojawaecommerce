# Icon Generation Guide

This guide explains how to generate all app icons from the current logo.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install --save-dev sharp
   ```

2. **Generate all icons:**
   ```bash
   node scripts/generate-icons.js
   ```

3. **Rebuild the app:**
   ```bash
   npm run build
   ```

4. **For Android APK, sync icons:**
   ```bash
   npx cap sync android
   ```

## What Gets Generated

### PWA Icons (in `public/icons/`)
- `icon-192x192.png` - PWA icon (192x192)
- `icon-512x512.png` - PWA icon (512x512)
- `icon-152x152.png` - Apple touch icon
- `icon-180x180.png` - Apple touch icon

### Android Icons (in `android/app/src/main/res/mipmap-*/`)
- `ic_launcher_foreground.png` - Adaptive icon foreground (all densities)
- `ic_launcher.png` - Standard launcher icon (all densities)
- `ic_launcher_round.png` - Round launcher icon (all densities)

## Manual Alternative (if script doesn't work)

If you can't use the script, you can manually convert the logo:

1. **Use an online tool:**
   - Go to https://realfavicongenerator.net/
   - Upload `public/logos/ojawa-logo.svg`
   - Generate all sizes
   - Download and place in appropriate folders

2. **Use ImageMagick (command line):**
   ```bash
   # Install ImageMagick first
   # Then convert SVG to PNG at different sizes
   convert public/logos/ojawa-logo.svg -resize 192x192 public/icons/icon-192x192.png
   convert public/logos/ojawa-logo.svg -resize 512x512 public/icons/icon-512x512.png
   ```

3. **Use GIMP/Photoshop:**
   - Open `public/logos/ojawa-logo.svg`
   - Export at each required size
   - Save to appropriate folders

## Android Icon Requirements

Android uses adaptive icons with foreground and background layers:

- **Foreground:** The logo (transparent background)
- **Background:** Solid color (defined in `res/values/ic_launcher_background.xml`)

The script generates the foreground icons. The background color is already configured.

## Verification

After generating icons:

1. **Check PWA manifest:**
   - Open `public/manifest.json`
   - Verify icon paths point to `/logos/ojawa-logo.png` or `/icons/icon-*.png`

2. **Check HTML:**
   - Open `index.html`
   - Verify favicon and Apple touch icon links

3. **Check Android:**
   - Open `android/app/src/main/AndroidManifest.xml`
   - Verify `android:icon="@mipmap/ic_launcher"` is set
   - Check that icons exist in `res/mipmap-*/` folders

4. **Test in browser:**
   - Build and run: `npm run build`
   - Check browser tab favicon
   - Check PWA install prompt icon

5. **Test Android APK:**
   - Build APK in Android Studio
   - Install on device
   - Check app launcher icon

