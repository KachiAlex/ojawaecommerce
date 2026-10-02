import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isTestMode = process.env.VITE_TEST_MODE === 'true'
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.mapbox.com https://router.project-osrm.org; frame-ancestors 'none'; form-action 'self'"
}

// Plugin to remove feature chunks from modulepreload - they'll be loaded on-demand
const lazyLoadPlugin = {
  name: 'lazy-load-features',
  transformIndexHtml: {
    order: 'post',
    handler: (html) => {
      // Remove all modulepreload links for feature chunks (admin, vendor, logistics, test-pages)
      // These will be lazy-loaded when needed, not preloaded
      let result = html.replace(/<link rel="modulepreload"[^>]*href="\/(admin|vendor|logistics|test-pages|tracking|Admin2)\.js"[^>]*>\n?/gi, '');
      
      return result;
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
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
            // Mapbox GL and geocoder go together to avoid circular deps
            if (id.includes('mapbox') || id.includes('@mapbox')) {
              return 'vendor-mapbox';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('framer-motion')) {
              return 'vendor-react';
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
      'react-router-dom'
    ]
  },
  server: {
    ...(isTestMode ? { headers: securityHeaders } : {}),
    proxy: {
      '/api': {
        target: 'https://ojawa.africa',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: isTestMode ? { headers: securityHeaders } : undefined
})
