import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isTestMode = process.env.VITE_TEST_MODE === 'true'
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://firestore.googleapis.com https://firebase.googleapis.com; frame-ancestors 'none'; form-action 'self'"
}

// Plugin to enforce strict module loading: React first, everything else after
const moduleOrderPlugin = {
  name: 'module-order',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => {
      // Remove vendor-misc from ALL loading (no preload, no dynamic load)
      // It will be lazy-loaded on-demand by the code that uses it
      let result = html.replace(/<link rel="modulepreload"[^>]*href="\/vendor-misc\.js"[^>]*>\n?/g, '');
      
      // Remove any dynamic loader script we added before
      result = result.replace(/<script>\s*\/\/\s*Dynamically[^<]*vendor-misc[^<]*<\/script>\n?/g, '');
      
      return result;
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), moduleOrderPlugin],
  // Environment variables are automatically available via import.meta.env
  // No need to hardcode API keys here - use .env file instead
  build: {
    rollupOptions: {
      output: {
        // Force .js extension for all chunks
        chunkFileNames: (chunkInfo) => {
          return chunkInfo.name + '.js';
        },
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name + '.js';
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.js')) {
            return assetInfo.name;
          }
          return assetInfo.name;
        },
        manualChunks: (id) => {
          // Keep React in its own chunk - MUST load first
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('framer-motion')) {
              return 'vendor-react';
            }
            // Firebase and Stripe/Flutterwave can load separately
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('@stripe') || id.includes('flutterwave')) {
              return 'vendor-payments';
            }
            // ALL OTHER libraries (charts, utilities, etc.) go into main bundle to ensure React is available
            // This prevents vendor-misc from trying to use React before it's initialized
            return undefined;  // Keep in main bundle
          }
          
          // Keep contexts with main bundle to ensure React is available
          if (id.includes('src/contexts/')) {
            return undefined;
          }
          
          // Feature chunks
          if (id.includes('src/pages/AdminDashboard') || id.includes('src/pages/AdminSetup') || id.includes('src/pages/AdminLogin')) {
            return 'admin';
          }
          if (id.includes('src/pages/Vendor') || id.includes('src/pages/BecomeVendor') || id.includes('src/components/StoreManager')) {
            return 'vendor';
          }
          if (id.includes('src/pages/Logistics') || id.includes('src/components/LogisticsTrackingManager')) {
            return 'logistics';
          }
          if (id.includes('src/pages/Tracking') || id.includes('src/components/TrackingInterface') || id.includes('src/components/EnhancedTrackingStatus')) {
            return 'tracking';
          }
          
          // Test pages chunk
          if (id.includes('Test') || id.includes('Debug')) {
            return 'test-pages';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    // Performance optimizations
    assetsInlineLimit: 8192, // Inline more assets for faster loading
    emptyOutDir: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore'
    ]
  },
  server: isTestMode ? { headers: securityHeaders } : undefined,
  preview: isTestMode ? { headers: securityHeaders } : undefined
})
