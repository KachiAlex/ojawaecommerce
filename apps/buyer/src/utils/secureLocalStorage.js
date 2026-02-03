/**
 * Secure Local Storage Utility
 * Encrypts sensitive data before storing in localStorage
 * Prevents XSS data theft and provides secure storage
 */

import { secureStorage } from './secureStorage';

class SecureLocalStorage {
  constructor() {
    this.prefix = 'ojawa_secure_';
    this.sessionPrefix = 'ojawa_session_';
  }

  /**
   * Set encrypted item in localStorage
   */
  async setItem(key, value) {
    try {
      const fullKey = this.prefix + key;
      await secureStorage.setItem(fullKey, value);
      return true;
    } catch (error) {
      console.error('SecureLocalStorage.setItem error:', error);
      return false;
    }
  }

  /**
   * Get and decrypt item from localStorage
   */
  async getItem(key) {
    try {
      const fullKey = this.prefix + key;
      return await secureStorage.getItem(fullKey);
    } catch (error) {
      console.error('SecureLocalStorage.getItem error:', error);
      return null;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeItem(key) {
    try {
      const fullKey = this.prefix + key;
      secureStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('SecureLocalStorage.removeItem error:', error);
      return false;
    }
  }

  /**
   * Set session-only item (cleared when tab closes)
   */
  async setSessionItem(key, value) {
    try {
      const fullKey = this.sessionPrefix + key;
      await secureStorage.setItem(fullKey, value);
      return true;
    } catch (error) {
      console.error('SecureLocalStorage.setSessionItem error:', error);
      return false;
    }
  }

  /**
   * Get session-only item
   */
  async getSessionItem(key) {
    try {
      const fullKey = this.sessionPrefix + key;
      return await secureStorage.getItem(fullKey);
    } catch (error) {
      console.error('SecureLocalStorage.getSessionItem error:', error);
      return null;
    }
  }

  /**
   * Remove session item
   */
  removeSessionItem(key) {
    try {
      const fullKey = this.sessionPrefix + key;
      secureStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('SecureLocalStorage.removeSessionItem error:', error);
      return false;
    }
  }

  /**
   * Clear all secure storage items
   */
  clear() {
    try {
      // Clear all ojawa prefixed items
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.prefix) || key.startsWith(this.sessionPrefix)) {
          secureStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('SecureLocalStorage.clear error:', error);
      return false;
    }
  }

  /**
   * Get all keys (without values)
   */
  getKeys() {
    try {
      return Object.keys(localStorage).filter(key => 
        key.startsWith(this.prefix) || key.startsWith(this.sessionPrefix)
      ).map(key => key.replace(this.prefix, '').replace(this.sessionPrefix, ''));
    } catch (error) {
      console.error('SecureLocalStorage.getKeys error:', error);
      return [];
    }
  }

  /**
   * Check if key exists
   */
  async hasKey(key) {
    const value = await this.getItem(key);
    return value !== null;
  }

  /**
   * Store user preferences (non-sensitive but persistent)
   */
  async setPreferences(preferences) {
    return await this.setItem('user_preferences', JSON.stringify(preferences));
  }

  /**
   * Get user preferences
   */
  async getPreferences() {
    const prefs = await this.getItem('user_preferences');
    try {
      return prefs ? JSON.parse(prefs) : {};
    } catch {
      return {};
    }
  }

  /**
   * Store auth token (highly sensitive)
   */
  async setAuthToken(token) {
    return await this.setItem('auth_token', token);
  }

  /**
   * Get auth token
   */
  async getAuthToken() {
    return await this.getItem('auth_token');
  }

  /**
   * Store user session data
   */
  async setUserSession(sessionData) {
    return await this.setSessionItem('user_session', JSON.stringify(sessionData));
  }

  /**
   * Get user session data
   */
  async getUserSession() {
    const session = await this.getSessionItem('user_session');
    try {
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  }

  /**
   * Store shopping cart data
   */
  async setCart(cartData) {
    return await this.setItem('shopping_cart', JSON.stringify(cartData));
  }

  /**
   * Get shopping cart data
   */
  async getCart() {
    const cart = await this.getItem('shopping_cart');
    try {
      return cart ? JSON.parse(cart) : [];
    } catch {
      return [];
    }
  }

  /**
   * Store form draft data
   */
  async setFormDraft(formId, draftData) {
    return await this.setItem(`form_draft_${formId}`, JSON.stringify(draftData));
  }

  /**
   * Get form draft data
   */
  async getFormDraft(formId) {
    const draft = await this.getItem(`form_draft_${formId}`);
    try {
      return draft ? JSON.parse(draft) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear form draft
   */
  clearFormDraft(formId) {
    return this.removeItem(`form_draft_${formId}`);
  }

  /**
   * Get storage usage statistics
   */
  getStorageUsage() {
    try {
      let totalSize = 0;
      let itemCount = 0;
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.prefix) || key.startsWith(this.sessionPrefix)) {
          const value = localStorage.getItem(key);
          totalSize += (key.length + (value ? value.length : 0)) * 2; // UTF-16 characters
          itemCount++;
        }
      });

      return {
        itemCount,
        totalSizeBytes: totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      console.error('SecureLocalStorage.getStorageUsage error:', error);
      return { itemCount: 0, totalSizeBytes: 0, totalSizeKB: '0.00', totalSizeMB: '0.00' };
    }
  }

  /**
   * Cleanup old/expired items
   */
  async cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    try {
      const now = Date.now();
      const keys = this.getKeys();
      let cleaned = 0;

      for (const key of keys) {
        const timestampKey = `${key}_timestamp`;
        const timestamp = await this.getItem(timestampKey);
        
        if (timestamp && (now - parseInt(timestamp)) > maxAge) {
          this.removeItem(key);
          this.removeItem(timestampKey);
          cleaned++;
        }
      }

      return cleaned;
    } catch (error) {
      console.error('SecureLocalStorage.cleanup error:', error);
      return 0;
    }
  }

  /**
   * Export all data (for backup)
   */
  async exportData() {
    try {
      const data = {};
      const keys = this.getKeys();

      for (const key of keys) {
        const value = await this.getItem(key);
        if (value !== null) {
          data[key] = value;
        }
      }

      return JSON.stringify(data);
    } catch (error) {
      console.error('SecureLocalStorage.exportData error:', error);
      return null;
    }
  }

  /**
   * Import data (from backup)
   */
  async importData(dataString) {
    try {
      const data = JSON.parse(dataString);
      let imported = 0;

      for (const [key, value] of Object.entries(data)) {
        if (await this.setItem(key, value)) {
          imported++;
        }
      }

      return imported;
    } catch (error) {
      console.error('SecureLocalStorage.importData error:', error);
      return 0;
    }
  }
}

// Create singleton instance
const secureLocalStorage = new SecureLocalStorage();

// Auto-cleanup on app start
if (typeof window !== 'undefined') {
  setTimeout(() => {
    secureLocalStorage.cleanup();
  }, 5000);
}

export default secureLocalStorage;
