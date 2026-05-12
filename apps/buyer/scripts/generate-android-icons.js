/**
 * Script to generate Android app icons from the logo PNG
 * Uses sharp to convert the PNG logo to Android launcher icon sizes
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

const logoPath = path.join(__dirname, '../public/logos/ojawa-logo.png');
const androidResDir = path.join(__dirname, '../android/app/src/main/res');

// Android mipmap sizes (foreground icons)
const androidSizes = {
  'mipmap-mdpi': 48,    // 48x48
  'mipmap-hdpi': 72,    // 72x72
  'mipmap-xhdpi': 96,   // 96x96
  'mipmap-xxhdpi': 144, // 144x144
  'mipmap-xxxhdpi': 192, // 192x192
};

async function generateAndroidIcons() {
  console.log('🎨 Generating Android app icons from logo...\n');

  if (!fs.existsSync(logoPath)) {
    console.error(`❌ Logo not found at: ${logoPath}`);
    process.exit(1);
  }

  try {
    // Generate Android launcher foreground icons
    console.log('🤖 Generating Android launcher icons...');
    
    for (const [mipmapFolder, size] of Object.entries(androidSizes)) {
      const mipmapPath = path.join(androidResDir, mipmapFolder);
      
      // Create mipmap directory if it doesn't exist
      if (!fs.existsSync(mipmapPath)) {
        fs.mkdirSync(mipmapPath, { recursive: true });
      }

      // For adaptive icons, use 66% of size to account for safe zone (Android recommendation)
      const foregroundSize = Math.floor(size * 0.66);
      const padding = Math.floor((size - foregroundSize) / 2);

      // Generate foreground icon (the logo with transparent background, centered with padding)
      const foregroundPath = path.join(mipmapPath, 'ic_launcher_foreground.png');
      await sharp(logoPath)
        .resize(foregroundSize, foregroundSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(foregroundPath);
      console.log(`  ✅ Generated ${mipmapFolder}/ic_launcher_foreground.png (${size}x${size})`);

      // Generate full launcher icon (for older Android versions) with white background
      const launcherPath = path.join(mipmapPath, 'ic_launcher.png');
      await sharp(logoPath)
        .resize(foregroundSize, foregroundSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(launcherPath);
      console.log(`  ✅ Generated ${mipmapFolder}/ic_launcher.png (${size}x${size})`);

      // Generate round launcher icon
      const roundPath = path.join(mipmapPath, 'ic_launcher_round.png');
      await sharp(logoPath)
        .resize(foregroundSize, foregroundSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(roundPath);
      console.log(`  ✅ Generated ${mipmapFolder}/ic_launcher_round.png (${size}x${size})`);
    }

    console.log('\n✨ All Android icons generated successfully!');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateAndroidIcons();

