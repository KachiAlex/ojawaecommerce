/**
 * Admin Analytics Service (REST-backed)
 * Uses Render backend endpoints under `/api/analytics`.
 */

const api = {
  async request(path, options = {}) {
    // Add authentication headers if available
    const token = localStorage.getItem('authToken');
    const headers = { 
      Accept: 'application/json', 
      ...(options.headers || {}) 
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(path, {
      credentials: 'include',
      headers,
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`Analytics API ${path} failed: ${res.status} ${res.statusText} ${text}`);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  },
};

export const adminAnalyticsService = {
  async logEvent(eventData) {
    try {
      const payload = {
        ...eventData,
        userAgent: navigator?.userAgent || 'unknown',
        sessionId: this.getSessionId?.() || null,
        timestamp: new Date().toISOString(),
      };
      await api.request('/api/analytics/events', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      return true;
    } catch (err) {
      console.error('Error logging event (REST):', err);
      return false;
    }
  },

  async startSession(userId, userRole) {
    try {
      const sessionId = this.generateSessionId?.() || `s_${Date.now()}`;
      sessionStorage.setItem('analyticsSessionId', sessionId);
      const payload = { sessionId, userId, userRole, startTime: new Date().toISOString(), isActive: true };
      const res = await api.request('/api/analytics/sessions', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      if (res && res.id) sessionStorage.setItem('analyticsSessionDocId', res.id);
      return sessionId;
    } catch (err) {
      console.error('Error starting session (REST):', err);
      return null;
    }
  },

  async endSession(userId) {
    try {
      const sessionDocId = sessionStorage.getItem('analyticsSessionDocId');
      if (!sessionDocId) return;
      await api.request(`/api/analytics/sessions/${sessionDocId}`, { method: 'PATCH', body: JSON.stringify({ endTime: new Date().toISOString(), isActive: false }), headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
      console.error('Error ending session (REST):', err);
    }
  },

  async logAction(actionData) {
    try {
      // Skip analytics for unauthenticated users
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('User not authenticated, skipping analytics logging');
        return false;
      }
      
      const payload = { ...actionData, timestamp: new Date().toISOString(), sessionId: this.getSessionId?.() || null, pagePath: window?.location?.pathname || 'unknown', pageTitle: document?.title || 'unknown' };
      await api.request('/api/analytics/events', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      return true;
    } catch (err) {
      console.error('Error logging action (REST):', err);
      return false;
    }
  },

  async logError(errorData) {
    try {
      const payload = { ...errorData, timestamp: new Date().toISOString(), sessionId: this.getSessionId?.() || null, pagePath: window?.location?.pathname || 'unknown', userAgent: navigator?.userAgent || 'unknown' };
      await api.request('/api/analytics/errors', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      return true;
    } catch (err) {
      console.error('Error logging error (REST):', err);
      return false;
    }
  },

  async logPerformanceMetrics(metricsData) {
    try {
      const payload = { ...metricsData, timestamp: new Date().toISOString(), sessionId: this.getSessionId?.() || null, pagePath: window?.location?.pathname || 'unknown' };
      await api.request('/api/analytics/performance', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      return true;
    } catch (err) {
      console.error('Error logging performance metrics (REST):', err);
      return false;
    }
  },

  async trackConversionFunnel(userId, funnelType, stage, metadata = {}) {
    try {
      const payload = { userId, funnelType, stage, metadata, timestamp: new Date().toISOString(), sessionId: this.getSessionId?.() || null, pagePath: window?.location?.pathname || 'unknown' };
      await api.request('/api/analytics/funnel', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      return true;
    } catch (err) {
      console.error('Error tracking conversion funnel (REST):', err);
      return false;
    }
  },

  async getDashboardMetrics(filters = {}) {
    try {
      const qs = new URLSearchParams(filters).toString();
      const res = await api.request(`/api/analytics/metrics?${qs}`);
      return res || null;
    } catch (err) {
      console.error('Error fetching dashboard metrics (REST):', err);
      return null;
    }
  },

  async getTotalEvents(startDate) {
    try {
      const res = await api.request(`/api/analytics/events/count?since=${encodeURIComponent(startDate)}`);
      return res.count || 0;
    } catch (err) {
      console.error('Error getting total events (REST):', err);
      return 0;
    }
  },

  async getEventsByCategory(startDate) {
    try {
      const res = await api.request(`/api/analytics/events?since=${encodeURIComponent(startDate)}&limit=1000`);
      const items = res.items || [];
      const categoryMap = {};
      items.forEach(i => { const c = i.category || 'unknown'; categoryMap[c] = (categoryMap[c] || 0) + 1; });
      return categoryMap;
    } catch (err) {
      console.error('Error getting events by category (REST):', err);
      return {};
    }
  },
  async getErrorStats(startDate) {
    try {
      const res = await api.request(`/api/analytics/errors?since=${encodeURIComponent(startDate)}&limit=500`);
      const items = res.items || [];
      const stats = {
        totalErrors: items.length,
        errorTypes: {},
        topErrors: []
      };
      items.forEach(it => {
        const errorType = it.errorType || 'unknown';
        stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + 1;
      });
      stats.topErrors = items.slice(0, 10).map(i => ({ id: i.id, ...i }));
      return stats;
    } catch (error) {
      console.error('Error getting error stats (REST):', error);
      return { totalErrors: 0, errorTypes: {}, topErrors: [] };
    }
  },

  async getPerformanceMetrics(startDate) {
    try {
      const res = await api.request(`/api/analytics/performance?since=${encodeURIComponent(startDate)}&limit=500`);
      const items = res.items || [];
      if (!items.length) return { avgPageLoadTime: 0, avgFCP: 0, avgLCP: 0, avgCLS: 0, totalSamples: 0 };
      let totalPageLoad = 0, totalFCP = 0, totalLCP = 0, totalCLS = 0;
      items.forEach(d => {
        totalPageLoad += d.pageLoadTime || 0;
        totalFCP += d.firstContentfulPaint || 0;
        totalLCP += d.largestContentfulPaint || 0;
        totalCLS += d.cumulativeLayoutShift || 0;
      });
      const count = items.length;
      return {
        avgPageLoadTime: (totalPageLoad / count).toFixed(2),
        avgFCP: (totalFCP / count).toFixed(2),
        avgLCP: (totalLCP / count).toFixed(2),
        avgCLS: (totalCLS / count).toFixed(2),
        totalSamples: count
      };
    } catch (error) {
      console.error('Error getting performance metrics (REST):', error);
      return { avgPageLoadTime: 0, avgFCP: 0, avgLCP: 0, avgCLS: 0, totalSamples: 0 };
    }
  },

  async getConversionMetrics(startDate) {
    try {
      const res = await api.request(`/api/analytics/conversion?since=${encodeURIComponent(startDate)}&limit=1000`);
      const items = res.items || [];
      const funnels = {};
      items.forEach(d => {
        const funnelType = d.funnelType || 'unknown';
        if (!funnels[funnelType]) funnels[funnelType] = { view: 0, start: 0, progress: 0, complete: 0, abandon: 0 };
        funnels[funnelType][d.stage] = (funnels[funnelType][d.stage] || 0) + 1;
      });
      const conversionRates = {};
      Object.keys(funnels).forEach(ft => {
        const funnel = funnels[ft];
        const total = funnel.view || 1;
        conversionRates[ft] = { ...funnel, conversionRate: ((funnel.complete / total) * 100).toFixed(2) + '%' };
      });
      return conversionRates;
    } catch (error) {
      console.error('Error getting conversion metrics (REST):', error);
      return {};
    }
  },

  async getUserEngagement(startDate) {
    try {
      const res = await api.request(`/api/analytics/engagement?since=${encodeURIComponent(startDate)}&limit=1000`);
      const items = res.items || [];
      if (!items.length) return { activeSessions: 0, averageSessionDuration: 0, totalSessions: 0, uniqueUsers: 0 };
      const uniqueUsers = new Set();
      let totalDuration = 0;
      items.forEach(d => {
        uniqueUsers.add(d.userId);
        if (d.startTime && d.endTime) {
          const start = new Date(d.startTime).getTime();
          const end = new Date(d.endTime).getTime();
          if (!isNaN(start) && !isNaN(end)) totalDuration += (end - start) / 1000;
        }
      });
      return {
        activeSessions: items.filter(i => i.isActive).length,
        averageSessionDuration: (totalDuration / items.length).toFixed(2) + 's',
        totalSessions: items.length,
        uniqueUsers: uniqueUsers.size
      };
    } catch (error) {
      console.error('Error getting user engagement (REST):', error);
      return { activeSessions: 0, averageSessionDuration: 0, totalSessions: 0, uniqueUsers: 0 };
    }
  },

  async exportAnalytics(format = 'json', filters = {}) {
    try {
      const timeRange = filters.timeRange || 'week';
      const startDate = this.getStartDate(timeRange);
      const res = await api.request(`/api/analytics/events?since=${encodeURIComponent(startDate)}&limit=5000`);
      const items = res.items || [];
      const events = items.map(i => ({ id: i.id, ...i, timestamp: i.timestamp || new Date().toISOString() }));
      if (format === 'csv') return this.convertToCSV(events);
      return JSON.stringify(events, null, 2);
    } catch (error) {
      console.error('Error exporting analytics (REST):', error);
      return null;
    }
  },

  /**
   * Helper: Get session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('analyticsSessionId');
    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('analyticsSessionId', sessionId);
    }
    return sessionId;
  },

  /**
   * Helper: Generate session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Helper: Get start date based on time range
   */
  getStartDate(timeRange) {
    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    return startDate;
  },

  /**
   * Helper: Convert events to CSV
   */
  convertToCSV(events) {
    const headers = ['ID', 'Event Type', 'Category', 'User ID', 'Timestamp', 'Severity'];
    const csvContent = [
      headers.join(','),
      ...events.map(event => [
        event.id,
        event.eventType || '',
        event.category || '',
        event.userId || '',
        event.timestamp || '',
        event.severity || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
  }
};

export default adminAnalyticsService;
