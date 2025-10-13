import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify('AIzaSyCw_5hgEojEOW1hAIewyb4TkyHTN2od-Yk'),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('@stripe') || id.includes('flutterwave')) {
              return 'vendor-payments';
            }
            return 'vendor-misc';
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
  }
})
