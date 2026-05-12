/**
 * Secure Notification System
 * Replaces alert() calls with secure toast notifications
 * Prevents social engineering attacks and provides better UX
 */

class SecureNotification {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.notificationId = 0;
    this.init();
  }

  init() {
    if (typeof document === 'undefined') return;
    
    // Create notification container
    this.container = document.createElement('div');
    this.container.id = 'secure-notification-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 5000) {
    if (!this.container) return;

    const id = ++this.notificationId;
    const notification = document.createElement('div');
    
    // Sanitize message to prevent XSS
    const sanitizedMessage = this.sanitizeMessage(message);
    
    // Set styles based on type
    const styles = this.getStyles(type);
    
    notification.style.cssText = `
      ${styles}
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease-in-out;
      margin-bottom: 10px;
      pointer-events: auto;
      cursor: pointer;
      max-width: 350px;
      word-wrap: break-word;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; padding: 12px 16px;">
        <span style="margin-right: 10px; font-size: 18px;">${this.getIcon(type)}</span>
        <span style="flex: 1;">${sanitizedMessage}</span>
        <span style="margin-left: 10px; cursor: pointer; opacity: 0.7;" onclick="this.parentElement.parentElement.remove()">×</span>
      </div>
    `;
    
    // Add to container
    this.container.appendChild(notification);
    this.notifications.set(id, notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
    
    return id;
  }

  remove(id) {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        this.notifications.delete(id);
      }, 300);
    }
  }

  sanitizeMessage(message) {
    if (typeof message !== 'string') return '';
    
    // Basic XSS prevention
    return message
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  getStyles(type) {
    const baseStyles = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border-left: 4px solid;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #333;
    `;
    
    const typeStyles = {
      success: 'border-color: #10b981; background: #f0fdf4;',
      error: 'border-color: #ef4444; background: #fef2f2;',
      warning: 'border-color: #f59e0b; background: #fffbeb;',
      info: 'border-color: #3b82f6; background: #eff6ff;'
    };
    
    return baseStyles + typeStyles[type] || typeStyles.info;
  }

  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  // Convenience methods
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  // Clear all notifications
  clear() {
    this.notifications.forEach((_, id) => this.remove(id));
  }
}

// Create singleton instance
const secureNotification = new SecureNotification();

// Export for use in components
export default secureNotification;

// Global replacement for alert() (optional - use with caution)
export const secureAlert = (message, type = 'info') => {
  return secureNotification.show(message, type);
};
