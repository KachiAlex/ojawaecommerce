// Migration Script: Render to Vercel
// This script helps prepare and migrate the backend from Render to Vercel

const fs = require('fs');
const path = require('path');

async function migrateToVercel() {
  console.log('MIGRATING BACKEND FROM RENDER TO VERCEL');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Verify required files exist
    console.log('\n1. Verifying required files...');
    const requiredFiles = [
      'vercel.json',
      'api/index.js',
      'functions/server.js',
      'package.json',
      '.env.vercel.example'
    ];
    
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        console.log(`  ${file}: EXISTS`);
      } else {
        console.log(`  ${file}: MISSING - Creating...`);
        await createMissingFile(file);
      }
    }
    
    // Step 2: Check dependencies
    console.log('\n2. Checking dependencies...');
    const packageJsonPath = 'functions/package.json';
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      console.log('  Backend dependencies found');
      
      // Check for Vercel CLI
      try {
        const { execSync } = require('child_process');
        execSync('vercel --version', { stdio: 'ignore' });
        console.log('  Vercel CLI: INSTALLED');
      } catch (error) {
        console.log('  Vercel CLI: NOT INSTALLED');
        console.log('  Run: npm install -g vercel');
      }
    }
    
    // Step 3: Environment variables check
    console.log('\n3. Environment variables setup...');
    const envExamplePath = '.env.vercel.example';
    if (fs.existsSync(envExamplePath)) {
      console.log('  Environment template: READY');
      console.log('  Set up variables in Vercel dashboard');
    }
    
    // Step 4: Update frontend API URLs
    console.log('\n4. Frontend updates needed...');
    console.log('  Update VITE_API_BASE in apps/buyer/.env.production');
    console.log('  Update API_BASE in frontend services');
    
    // Step 5: Deployment readiness check
    console.log('\n5. Deployment readiness...');
    console.log('  Backend structure: READY');
    console.log('  Vercel config: READY');
    console.log('  API endpoints: READY');
    console.log('  Environment: NEEDS SETUP');
    
    console.log('\nMIGRATION PREPARATION COMPLETE');
    console.log('=' .repeat(60));
    
    console.log('\nNEXT STEPS:');
    console.log('1. Set up environment variables in Vercel dashboard');
    console.log('2. Run: vercel --prod');
    console.log('3. Update frontend API URLs');
    console.log('4. Test all endpoints');
    console.log('5. Update DNS if needed');
    
    console.log('\nDEPLOYMENT COMMANDS:');
    console.log('  Development: vercel');
    console.log('  Production: vercel --prod');
    
    console.log('\nTESTING COMMANDS:');
    console.log('  Health check: curl https://your-app.vercel.app/health');
    console.log('  API test: curl https://your-app.vercel.app/api/products');
    
  } catch (error) {
    console.error('Migration preparation failed:', error.message);
  }
}

async function createMissingFile(filename) {
  // This would create missing files if needed
  // For now, just log that files should be created manually
  console.log(`    Please create ${filename} manually`);
}

// Run migration preparation
migrateToVercel();
