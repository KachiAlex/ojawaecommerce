/**
 * Script to generate app icons from the logo SVG
 * 
 * This script uses sharp (npm package) to convert the SVG logo to various PNG sizes
 * needed for PWA, Android, and iOS.
 * 
 * Install dependencies:
 * npm install --save-dev sharp
 * 
 * Run:
 * node scripts/generate-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if sharp is available
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('❌ Error: sharp package not found.');
  console.log('📦 Please install it first: npm install --save-dev sharp');
  process.exit(1);
}

const logoPath = path.join(__dirname, '../public/logos/ojawa-logo.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Icon sizes needed
const iconSizes = {
  // PWA icons
  'icon-192x192.png': 192,
  'icon-512x512.png': 512,
  // Apple touch icons
  'icon-152x152.png': 152,
  'icon-180x180.png': 180,
  // Android launcher icons (foreground only, will be used in adaptive icons)
  'android-48.png': 48,
  'android-72.png': 72,
  'android-96.png': 96,
  'android-144.png': 144,
  'android-192.png': 192,
};

// Android mipmap sizes (foreground icons)
const androidSizes = {
  'mipmap-mdpi': 48,    // 48x48
  'mipmap-hdpi': 72,    // 72x72
  'mipmap-xhdpi': 96,   // 96x96
  'mipmap-xxhdpi': 144, // 144x144
  'mipmap-xxxhdpi': 192, // 192x192
};

async function generateIcons() {
  console.log('🎨 Generating app icons from logo...\n');

  if (!fs.existsSync(logoPath)) {
    console.error(`❌ Logo not found at: ${logoPath}`);
    console.log('📝 Please ensure the logo SVG exists at public/logos/ojawa-logo.svg');
    process.exit(1);
  }

  try {
    // Generate PWA and general icons
    console.log('📱 Generating PWA and general icons...');
    for (const [filename, size] of Object.entries(iconSizes)) {
      const outputPath = path.join(outputDir, filename);
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`  ✅ Generated ${filename} (${size}x${size})`);
    }

    // Generate Android launcher foreground icons
    console.log('\n🤖 Generating Android launcher icons...');
    const androidResDir = path.join(__dirname, '../android/app/src/main/res');
    
    for (const [mipmapFolder, size] of Object.entries(androidSizes)) {
      const mipmapPath = path.join(androidResDir, mipmapFolder);
      
      // Create mipmap directory if it doesn't exist
      if (!fs.existsSync(mipmapPath)) {
        fs.mkdirSync(mipmapPath, { recursive: true });
      }

      // Generate foreground icon (the logo)
      const foregroundPath = path.join(mipmapPath, 'ic_launcher_foreground.png');
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(foregroundPath);
      console.log(`  ✅ Generated ${mipmapFolder}/ic_launcher_foreground.png (${size}x${size})`);

      // Generate full launcher icon (for older Android versions)
      const launcherPath = path.join(mipmapPath, 'ic_launcher.png');
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(launcherPath);
      console.log(`  ✅ Generated ${mipmapFolder}/ic_launcher.png (${size}x${size})`);

      // Generate round launcher icon
      const roundPath = path.join(mipmapPath, 'ic_launcher_round.png');
      await sharp(logoPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(roundPath);
      console.log(`  ✅ Generated ${mipmapFolder}/ic_launcher_round.png (${size}x${size})`);
    }

    console.log('\n✨ All icons generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Review the generated icons in public/icons/');
    console.log('  2. Review Android icons in android/app/src/main/res/mipmap-*/');
    console.log('  3. Rebuild the app: npm run build');
    console.log('  4. For Android: npx cap sync android');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

