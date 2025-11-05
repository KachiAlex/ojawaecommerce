// Performance monitoring utility for AI Assistant
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTimes: [],
      apiResponseTimes: [],
      messageCount: 0,
      averageRenderTime: 0,
      averageApiTime: 0
    };
    this.maxMetrics = 100; // Keep last 100 measurements
  }

  // Mark start of a performance measurement
  markStart(label) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${label}-start`);
    }
    return Date.now();
  }

  // Mark end of a performance measurement
  markEnd(label, startTime) {
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
    }

    const duration = Date.now() - startTime;
    this.recordMetric(label, duration);
    return duration;
  }

  // Record a performance metric
  recordMetric(type, value) {
    if (type === 'render') {
      this.metrics.renderTimes.push(value);
      if (this.metrics.renderTimes.length > this.maxMetrics) {
        this.metrics.renderTimes.shift();
      }
      this.metrics.averageRenderTime = this.calculateAverage(this.metrics.renderTimes);
    } else if (type === 'api') {
      this.metrics.apiResponseTimes.push(value);
      if (this.metrics.apiResponseTimes.length > this.maxMetrics) {
        this.metrics.apiResponseTimes.shift();
      }
      this.metrics.averageApiTime = this.calculateAverage(this.metrics.apiResponseTimes);
    }
  }

  // Calculate average
  calculateAverage(array) {
    if (array.length === 0) return 0;
    return array.reduce((a, b) => a + b, 0) / array.length;
  }

  // Get performance summary
  getSummary() {
    return {
      ...this.metrics,
      renderCount: this.metrics.renderTimes.length,
      apiCount: this.metrics.apiResponseTimes.length
    };
  }

  // Log performance summary to console
  logSummary() {
    const summary = this.getSummary();
    console.group('🚀 AI Assistant Performance Metrics');
    console.log(`Average Render Time: ${summary.averageRenderTime.toFixed(2)}ms`);
    console.log(`Average API Response Time: ${summary.averageApiTime.toFixed(2)}ms`);
    console.log(`Total Renders: ${summary.renderCount}`);
    console.log(`Total API Calls: ${summary.apiCount}`);
    console.groupEnd();
  }

  // Clear all metrics
  clear() {
    this.metrics = {
      renderTimes: [],
      apiResponseTimes: [],
      messageCount: 0,
      averageRenderTime: 0,
      averageApiTime: 0
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
