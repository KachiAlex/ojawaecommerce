import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize bundle size
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'payment-vendor': ['@stripe/stripe-js', '@stripe/react-stripe-js', 'flutterwave-react-v3'],
          
          // App chunks
          'pages': [
            './src/pages/HomeNew.jsx',
            './src/pages/Products.jsx',
            './src/pages/Cart.jsx',
            './src/pages/Login.jsx',
            './src/pages/Register.jsx'
          ],
          'vendor-pages': [
            './src/pages/Vendor.jsx',
            './src/pages/BecomeVendor.jsx'
          ],
          'admin-pages': [
            './src/pages/Admin.jsx',
            './src/pages/AdminDashboard.jsx'
          ],
          'components': [
            './src/components/Navbar.jsx',
            './src/components/MobileBottomNavigation.jsx',
            './src/components/ProductCard.jsx'
          ]
        },
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace('.jsx', '') : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `images/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging
    sourcemap: false,
    // Optimize CSS
    cssCodeSplit: true,
    cssMinify: true,
  },
  // Development optimizations
  server: {
    hmr: {
      overlay: false
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/firestore',
      'firebase/auth'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  // Define environment variables
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
});
