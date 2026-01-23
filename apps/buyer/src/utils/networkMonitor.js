// Network monitoring and connection quality assessment
import networkManager from './networkManager';

class NetworkMonitor {
  constructor() {
    this.connectionQuality = 'unknown';
    this.lastCheckTime = 0;
    this.checkInterval = 30000; // Check every 30 seconds
    this.metrics = {
      latency: [],
      throughput: [],
      errors: 0,
      successes: 0
    };
    
    this.init();
  }

  init() {
    // Listen to network manager events
    networkManager.addListener(this.handleNetworkChange.bind(this));
    
    // Start periodic checks
    this.startPeriodicChecks();
    
    // Monitor Firebase connection
    this.monitorFirebaseConnection();
  }

  handleNetworkChange(event, data) {
    console.log('📊 Network Monitor: Status changed', { event, isOnline: data.isOnline });
    
    if (event === 'online') {
      this.assessConnectionQuality();
    }
  }

  async assessConnectionQuality() {
    try {
      // Use Network Information API if available (better than Firebase test)
      if ('connection' in navigator) {
        const conn = navigator.connection;
        const rtt = conn.rtt || 0; // Round-trip time in ms
        
        this.metrics.latency.push(rtt);
        
        // Keep only last 10 measurements
        if (this.metrics.latency.length > 10) {
          this.metrics.latency = this.metrics.latency.slice(-10);
        }
        
        // Determine connection quality
        this.updateConnectionQuality(rtt);
        
        this.metrics.successes++;
      } else {
        // Fallback: assume good quality if online
        this.connectionQuality = 'good';
      }
      
    } catch {
      // Silently handle - not critical
      this.metrics.errors++;
      this.connectionQuality = 'unknown';
    }
  }

  async testFirebaseConnection() {
    // Simple Firebase connection test using a collection with proper permissions
    const { db } = await import('../firebase/config');
    const { doc, getDoc } = await import('firebase/firestore');
    
    // Try to read from users collection (has read permissions for authenticated users)
    // Use a non-existent document to minimize data transfer
    const testRef = doc(db, 'users', 'connection-test');
    return await getDoc(testRef);
  }

  updateConnectionQuality() {
    const avgLatency = this.getAverageLatency();
    
    if (avgLatency < 100) {
      this.connectionQuality = 'excellent';
    } else if (avgLatency < 300) {
      this.connectionQuality = 'good';
    } else if (avgLatency < 1000) {
      this.connectionQuality = 'fair';
    } else {
      this.connectionQuality = 'poor';
    }
  }

  getAverageLatency() {
    if (this.metrics.latency.length === 0) return 0;
    return this.metrics.latency.reduce((sum, lat) => sum + lat, 0) / this.metrics.latency.length;
  }

  startPeriodicChecks() {
    setInterval(() => {
      if (networkManager.isOnline) {
        this.assessConnectionQuality();
      }
    }, this.checkInterval);
  }

  monitorFirebaseConnection() {
    // Monitor Firebase connection state
    if (typeof window !== 'undefined') {
      // Listen for Firebase connection errors
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const message = args.join(' ');
        if (message.includes('Firestore') && message.includes('transport errored')) {
          console.warn('🔥 Firebase connection issue detected');
          this.metrics.errors++;
          this.connectionQuality = 'poor';
        }
        originalConsoleError.apply(console, args);
      };
    }
  }

  getConnectionRecommendations() {
    const recommendations = [];
    
    switch (this.connectionQuality) {
      case 'poor':
        recommendations.push('Consider using cached data');
        recommendations.push('Reduce image quality');
        recommendations.push('Enable offline mode');
        break;
      case 'fair':
        recommendations.push('Use compressed images');
        recommendations.push('Enable lazy loading');
        break;
      case 'good':
        recommendations.push('Normal operation');
        break;
      case 'excellent':
        recommendations.push('Full features available');
        break;
    }
    
    return recommendations;
  }

  getMetrics() {
    return {
      ...this.metrics,
      connectionQuality: this.connectionQuality,
      avgLatency: this.getAverageLatency(),
      connectionInfo: networkManager.getConnectionInfo(),
      isSlowConnection: networkManager.isSlowConnection()
    };
  }
}

// Create singleton instance
const networkMonitor = new NetworkMonitor();

export default networkMonitor;
