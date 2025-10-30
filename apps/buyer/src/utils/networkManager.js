// Network Manager for handling connectivity issues and offline resilience
class NetworkManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
    this.listeners = new Set();
    
    this.init();
  }

  init() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Monitor network quality
    this.startNetworkMonitoring();
  }

  handleOnline() {
    console.log('🌐 Network: Connection restored');
    this.isOnline = true;
    this.notifyListeners('online');
    
    // Retry failed requests
    this.retryFailedRequests();
  }

  handleOffline() {
    console.log('📴 Network: Connection lost');
    this.isOnline = false;
    this.notifyListeners('offline');
  }

  startNetworkMonitoring() {
    // Use navigator.connection if available
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      connection.addEventListener('change', () => {
        console.log('📊 Network: Connection changed', {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        });
        
        // Adjust retry strategy based on connection quality
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          this.maxRetries = 5;
          this.retryDelay = 2000;
        } else {
          this.maxRetries = 3;
          this.retryDelay = 1000;
        }
      });
    }
  }

  async retryWithBackoff(fn, context = 'unknown') {
    const attempts = this.retryAttempts.get(context) || 0;
    
    if (attempts >= this.maxRetries) {
      console.warn(`⚠️ Network: Max retries reached for ${context}`);
      this.retryAttempts.delete(context);
      throw new Error(`Network request failed after ${this.maxRetries} attempts`);
    }

    try {
      const result = await fn();
      this.retryAttempts.delete(context);
      return result;
    } catch (error) {
      if (this.isNetworkError(error)) {
        this.retryAttempts.set(context, attempts + 1);
        const delay = this.retryDelay * Math.pow(2, attempts); // Exponential backoff
        
        console.warn(`🔄 Network: Retrying ${context} in ${delay}ms (attempt ${attempts + 1}/${this.maxRetries})`);
        
        await this.delay(delay);
        return this.retryWithBackoff(fn, context);
      } else {
        this.retryAttempts.delete(context);
        throw error;
      }
    }
  }

  isNetworkError(error) {
    if (!error) return false;
    
    const networkErrorPatterns = [
      'ERR_INTERNET_DISCONNECTED',
      'ERR_NETWORK_CHANGED',
      'ERR_CONNECTION_TIMED_OUT',
      'ERR_CONNECTION_RESET',
      'ERR_CONNECTION_REFUSED',
      'Failed to fetch',
      'Network request failed',
      'Connection timeout'
    ];

    const errorMessage = error.message || error.toString();
    return networkErrorPatterns.some(pattern => 
      errorMessage.includes(pattern)
    );
  }

  async retryFailedRequests() {
    // This would typically retry queued offline requests
    console.log('🔄 Network: Retrying failed requests');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event, { isOnline: this.isOnline });
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });
  }

  // Firebase-specific network handling
  async withFirebaseRetry(firebaseOperation, context) {
    return this.retryWithBackoff(async () => {
      try {
        return await firebaseOperation();
      } catch (error) {
        if (this.isNetworkError(error)) {
          console.warn(`🔥 Firebase: Network error in ${context}:`, error.message);
          throw error;
        }
        // Re-throw non-network errors immediately
        throw error;
      }
    }, `firebase-${context}`);
  }

  // Flutterwave-specific network handling
  async withFlutterwaveRetry(flutterwaveOperation, context) {
    return this.retryWithBackoff(async () => {
      try {
        return await flutterwaveOperation();
      } catch (error) {
        if (this.isNetworkError(error)) {
          console.warn(`💳 Flutterwave: Network error in ${context}:`, error.message);
          throw error;
        }
        throw error;
      }
    }, `flutterwave-${context}`);
  }

  getConnectionInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  isSlowConnection() {
    const connectionInfo = this.getConnectionInfo();
    return connectionInfo && (
      connectionInfo.effectiveType === 'slow-2g' || 
      connectionInfo.effectiveType === '2g' ||
      connectionInfo.downlink < 0.5
    );
  }
}

// Create singleton instance
const networkManager = new NetworkManager();

export default networkManager;
