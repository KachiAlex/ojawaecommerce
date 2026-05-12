/**
 * Storage Cleanup Scheduler
 * Automatically cleans up expired storage items and manages storage quotas
 */

import secureLocalStorage from './secureLocalStorage';

class StorageCleanupScheduler {
  constructor() {
    this.cleanupInterval = null;
    this.isRunning = false;
    this.defaultCleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.shortCleanupInterval = 60 * 60 * 1000; // 1 hour for development
  }

  /**
   * Start the cleanup scheduler
   */
  start(options = {}) {
    if (this.isRunning) {
      console.warn('Storage cleanup scheduler is already running');
      return;
    }

    const {
      interval = this.defaultCleanupInterval,
      runImmediately = true,
      maxAge = 7 * 24 * 60 * 60 * 1000, // 7 days default
      onCleanup = null
    } = options;

    this.isRunning = true;
    
    // Run cleanup immediately if requested
    if (runImmediately) {
      this.performCleanup(maxAge, onCleanup);
    }

    // Set up recurring cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup(maxAge, onCleanup);
    }, interval);

    console.log(`🧹 Storage cleanup scheduler started (interval: ${interval / 1000 / 60 / 60} hours)`);
  }

  /**
   * Stop the cleanup scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.warn('Storage cleanup scheduler is not running');
      return;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
    console.log('🛑 Storage cleanup scheduler stopped');
  }

  /**
   * Perform cleanup of expired items
   */
  async performCleanup(maxAge, onCleanup) {
    try {
      console.log('🧹 Starting storage cleanup...');
      
      const startTime = Date.now();
      const cleanedItems = await secureLocalStorage.cleanup(maxAge);
      const storageUsage = secureLocalStorage.getStorageUsage();
      
      const duration = Date.now() - startTime;
      
      const cleanupReport = {
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        itemsCleaned: cleanedItems,
        storageUsage: storageUsage
      };

      console.log('✅ Storage cleanup completed:', cleanupReport);

      // Call custom cleanup callback if provided
      if (typeof onCleanup === 'function') {
        try {
          await onCleanup(cleanupReport);
        } catch (callbackError) {
          console.error('Cleanup callback error:', callbackError);
        }
      }

      // Emit cleanup event for other parts of the app to listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('storageCleanup', { 
          detail: cleanupReport 
        }));
      }

      return cleanupReport;
    } catch (error) {
      console.error('❌ Storage cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    return secureLocalStorage.getStorageUsage();
  }

  /**
   * Force immediate cleanup
   */
  async forceCleanup(maxAge) {
    return await this.performCleanup(maxAge || 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Check if scheduler is running
   */
  isActive() {
    return this.isRunning;
  }

  /**
   * Set up automatic cleanup based on storage quota
   */
  setupQuotaBasedCleanup() {
    if (typeof window === 'undefined') return;

    // Monitor storage usage and clean up if needed
    const checkQuota = () => {
      const usage = secureLocalStorage.getStorageUsage();
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
      const warningThreshold = 0.8; // 80% warning

      if (usage.totalSizeBytes > maxSizeBytes * warningThreshold) {
        console.warn('⚠️ Storage usage approaching limit:', usage);
        
        // Trigger cleanup with shorter max age
        this.forceCleanup(3 * 24 * 60 * 60 * 1000) // 3 days
          .catch(error => console.error('Quota-based cleanup failed:', error));
      }
    };

    // Check quota every 30 minutes
    setInterval(checkQuota, 30 * 60 * 1000);
    
    // Also check on page visibility change (user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkQuota();
      }
    });
  }

  /**
   * Cleanup on app startup
   */
  async startupCleanup() {
    try {
      console.log('🚀 Performing startup storage cleanup...');
      
      // Clean up very old items (30 days)
      const oldItemsCleaned = await secureLocalStorage.cleanup(30 * 24 * 60 * 60 * 1000);
      
      // Clean up session items (should be cleared on tab close anyway)
      const sessionKeys = secureLocalStorage.getKeys().filter(key => 
        key.startsWith('session_')
      );
      sessionKeys.forEach(key => secureLocalStorage.removeSessionItem(key));
      
      console.log(`✅ Startup cleanup completed: ${oldItemsCleaned} old items removed, ${sessionKeys.length} session items cleared`);
      
      return {
        oldItemsCleaned,
        sessionItemsCleared: sessionKeys.length
      };
    } catch (error) {
      console.error('❌ Startup cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Export storage data for backup
   */
  async exportStorage() {
    try {
      const data = await secureLocalStorage.exportData();
      const stats = secureLocalStorage.getStorageUsage();
      
      return {
        data,
        stats,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Storage export failed:', error);
      throw error;
    }
  }

  /**
   * Import storage data from backup
   */
  async importStorage(dataString) {
    try {
      const imported = await secureLocalStorage.importData(dataString);
      console.log(`✅ Storage import completed: ${imported} items imported`);
      return imported;
    } catch (error) {
      console.error('Storage import failed:', error);
      throw error;
    }
  }

  /**
   * Reset all storage (dangerous!)
   */
  async resetAll() {
    if (typeof window !== 'undefined' && 
        !confirm('⚠️ This will delete ALL stored data. Are you sure?')) {
      return false;
    }

    try {
      secureLocalStorage.clear();
      console.log('🗑️ All storage data has been cleared');
      return true;
    } catch (error) {
      console.error('Storage reset failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const storageCleanupScheduler = new StorageCleanupScheduler();

// Auto-start cleanup in production
if (typeof window !== 'undefined') {
  // Wait for app to initialize
  setTimeout(() => {
    const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    
    // Start with appropriate interval
    storageCleanupScheduler.start({
      interval: isDevelopment 
        ? storageCleanupScheduler.shortCleanupInterval 
        : storageCleanupScheduler.defaultCleanupInterval,
      runImmediately: true,
      maxAge: isDevelopment ? 1 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000, // 1 day dev, 7 days prod
      onCleanup: (report) => {
        // Log to analytics or monitoring service in production
        if (!isDevelopment) {
          console.log('📊 Storage cleanup report:', report);
          // TODO: Send to analytics service
        }
      }
    });

    // Set up quota-based cleanup
    storageCleanupScheduler.setupQuotaBasedCleanup();

    // Perform startup cleanup
    storageCleanupScheduler.startupCleanup().catch(error => {
      console.error('Startup cleanup failed:', error);
    });
  }, 2000);
}

export default storageCleanupScheduler;
