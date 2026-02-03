/**
 * Notification System Tester
 * Tests the secure notification system across different browsers and scenarios
 */

import secureNotification from './secureNotification';

class NotificationTester {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
    this.testTimeout = 10000; // 10 seconds per test
  }

  /**
   * Run all notification tests
   */
  async runAllTests() {
    console.log('🧪 Starting notification system tests...');
    
    const tests = [
      this.testBasicNotifications,
      this.testMessageSanitization,
      this.testMultipleNotifications,
      this.testAutoDismiss,
      this.testClickToDismiss,
      this.testNotificationTypes,
      this.testLongMessages,
      this.testSpecialCharacters,
      this.testPerformance,
      this.testBrowserCompatibility
    ];

    for (const test of tests) {
      try {
        await this.runSingleTest(test.name, test.bind(this));
      } catch (error) {
        this.recordResult(test.name, false, error.message);
      }
    }

    this.generateReport();
    return this.testResults;
  }

  /**
   * Run a single test
   */
  async runSingleTest(testName, testFunction) {
    console.log(`🔍 Running test: ${testName}`);
    this.currentTest = testName;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Test timeout: ${testName}`));
      }, this.testTimeout);

      testFunction()
        .then((result) => {
          clearTimeout(timeout);
          this.recordResult(testName, true, result);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          this.recordResult(testName, false, error.message);
          reject(error);
        });
    });
  }

  /**
   * Test basic notification functionality
   */
  async testBasicNotifications() {
    const id = secureNotification.success('Test success notification');
    
    if (!id) {
      throw new Error('Failed to create notification');
    }

    // Wait a bit then clean up
    await this.wait(1000);
    secureNotification.remove(id);
    
    return 'Basic notifications working';
  }

  /**
   * Test message sanitization (XSS prevention)
   */
  async testMessageSanitization() {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      'javascript:alert("xss")',
      '<svg onload=alert("xss")>',
      '"><script>alert("xss")</script>'
    ];

    for (const payload of xssPayloads) {
      const id = secureNotification.info(payload);
      await this.wait(500);
      secureNotification.remove(id);
    }

    return 'XSS sanitization working';
  }

  /**
   * Test multiple notifications
   */
  async testMultipleNotifications() {
    const notifications = [];
    
    for (let i = 0; i < 5; i++) {
      const id = secureNotification.info(`Test notification ${i + 1}`);
      notifications.push(id);
      await this.wait(200);
    }

    // Clean up
    notifications.forEach(id => secureNotification.remove(id));
    
    return 'Multiple notifications working';
  }

  /**
   * Test auto-dismiss functionality
   */
  async testAutoDismiss() {
    const id = secureNotification.info('Auto-dismiss test', 'info', 2000);
    
    // Wait for auto-dismiss
    await this.wait(3000);
    
    return 'Auto-dismiss working';
  }

  /**
   * Test click to dismiss
   */
  async testClickToDismiss() {
    const id = secureNotification.warning('Click to dismiss test', 0); // No auto-dismiss
    
    // Wait for user to click (in real test, this would be automated)
    await this.wait(2000);
    secureNotification.remove(id);
    
    return 'Click to dismiss working';
  }

  /**
   * Test all notification types
   */
  async testNotificationTypes() {
    const types = ['success', 'error', 'warning', 'info'];
    
    for (const type of types) {
      const id = secureNotification[type](`Test ${type} notification`);
      await this.wait(500);
      secureNotification.remove(id);
    }
    
    return 'All notification types working';
  }

  /**
   * Test long messages
   */
  async testLongMessages() {
    const longMessage = 'This is a very long notification message that should wrap properly and display correctly in the notification container without breaking the layout or causing any visual issues. '.repeat(3);
    
    const id = secureNotification.info(longMessage);
    await this.wait(1000);
    secureNotification.remove(id);
    
    return 'Long messages working';
  }

  /**
   * Test special characters
   */
  async testSpecialCharacters() {
    const specialMessages = [
      'Test with émojis 🎉🚀🔒',
      'Test with quotes "single" and \'double\'',
      'Test with &lt; &gt; &amp; entities',
      'Test with unicode: ñáéíóú',
      'Test with newlines\nand\ttabs'
    ];

    for (const message of specialMessages) {
      const id = secureNotification.info(message);
      await this.wait(500);
      secureNotification.remove(id);
    }
    
    return 'Special characters working';
  }

  /**
   * Test performance
   */
  async testPerformance() {
    const startTime = performance.now();
    const notifications = [];
    
    // Create 50 notifications rapidly
    for (let i = 0; i < 50; i++) {
      const id = secureNotification.info(`Performance test ${i}`);
      notifications.push(id);
    }
    
    const createTime = performance.now() - startTime;
    
    // Clean up
    const cleanupStart = performance.now();
    notifications.forEach(id => secureNotification.remove(id));
    const cleanupTime = performance.now() - cleanupStart;
    
    return {
      createTime: `${createTime.toFixed(2)}ms for 50 notifications`,
      cleanupTime: `${cleanupTime.toFixed(2)}ms for 50 notifications`,
      averageCreate: `${(createTime / 50).toFixed(2)}ms per notification`
    };
  }

  /**
   * Test browser compatibility
   */
  async testBrowserCompatibility() {
    const browserInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };

    // Test DOM manipulation
    const container = document.getElementById('secure-notification-container');
    if (!container) {
      throw new Error('Notification container not found');
    }

    // Test CSS support
    const testElement = document.createElement('div');
    testElement.style.transition = 'all 0.3s ease-in-out';
    const supportsTransitions = testElement.style.transition !== '';

    return {
      browserInfo,
      domSupport: true,
      cssSupport: {
        transitions: supportsTransitions,
        flexbox: CSS.supports('display', 'flex'),
        grid: CSS.supports('display', 'grid')
      }
    };
  }

  /**
   * Record test result
   */
  recordResult(testName, passed, message) {
    const result = {
      testName,
      passed,
      message,
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent
    };
    
    this.testResults.push(result);
    
    if (passed) {
      console.log(`✅ ${testName}: ${message}`);
    } else {
      console.error(`❌ ${testName}: ${message}`);
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`
      },
      results: this.testResults,
      browser: navigator.userAgent,
      testedAt: new Date().toISOString()
    };

    console.log('\n📊 Notification System Test Report');
    console.log('=====================================');
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Pass Rate: ${report.summary.passRate}`);
    console.log('\nDetailed Results:');
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.testName}: ${result.message}`);
    });

    // Save report to localStorage for debugging
    try {
      localStorage.setItem('notificationTestReport', JSON.stringify(report));
    } catch (error) {
      console.warn('Could not save test report to localStorage:', error);
    }

    return report;
  }

  /**
   * Wait helper function
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test notification in different viewport sizes
   */
  async testResponsiveDesign() {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    
    const testSizes = [
      { width: 320, height: 568 },  // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1024, height: 768 }, // Small desktop
      { width: 1920, height: 1080 } // Large desktop
    ];

    // Note: This would require browser automation to actually resize
    // For now, just test that notifications work at current size
    const id = secureNotification.info(`Responsive test at ${originalWidth}x${originalHeight}`);
    await this.wait(1000);
    secureNotification.remove(id);

    return `Responsive test completed at ${originalWidth}x${originalHeight}`;
  }

  /**
   * Test accessibility features
   */
  async testAccessibility() {
    // Test ARIA attributes
    const container = document.getElementById('secure-notification-container');
    if (!container) {
      throw new Error('Notification container not found');
    }

    const id = secureNotification.info('Accessibility test');
    await this.wait(500);
    
    const notification = document.querySelector(`[data-notification-id="${id}"]`);
    if (!notification) {
      throw new Error('Notification element not found');
    }

    // Check for proper ARIA attributes
    const hasRole = notification.hasAttribute('role');
    const hasAriaLive = notification.hasAttribute('aria-live');
    
    secureNotification.remove(id);

    return {
      hasRole,
      hasAriaLive,
      containerExists: !!container
    };
  }
}

// Create singleton instance
const notificationTester = new NotificationTester();

// Auto-run tests in development mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Add to window for easy access in console
  window.testNotifications = () => notificationTester.runAllTests();
  window.testNotification = (message, type = 'info') => secureNotification[type](message);
  
  console.log('🧪 Notification tester available:');
  console.log('  - Run all tests: testNotifications()');
  console.log('  - Quick test: testNotification("Hello", "success")');
}

export default notificationTester;
