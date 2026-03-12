/**
 * Firebase Cloud Functions for Admin Analytics
 * Add this to your functions/index.js or functions/src/analytics.js
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const db = admin.firestore();

const ANALYTICS_COLLECTIONS = {
  EVENTS: 'analytics_events',
  USER_SESSIONS: 'user_sessions',
  ERROR_LOGS: 'error_logs',
  PERFORMANCE_METRICS: 'performance_metrics',
  CONVERSION_FUNNEL: 'conversion_funnel',
  DAILY_REPORTS: 'daily_reports',
  ALERTS: 'analytics_alerts'
};

/**
 * Daily Analytics Report Generation
 * Runs at 2 AM UTC every day
 */
exports.generateDailyAnalyticsReport = onSchedule(
  {
    schedule: "0 2 * * *", // Every day at 2 AM UTC
    timeoutSeconds: 300,
    memory: "512MB"
  },
  async (context) => {
    try {
      console.log("Starting daily analytics report generation...");

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setDate(today.getDate());
      today.setHours(0, 0, 0, 0);

      // Fetch yesterday's events
      const eventsSnapshot = await db.collection(ANALYTICS_COLLECTIONS.EVENTS)
        .where('timestamp', '>=', yesterday)
        .where('timestamp', '<', today)
        .get();

      const eventsData = eventsSnapshot.docs.map(doc => doc.data());

      // Generate report
      const report = {
        date: yesterday.toISOString().split('T')[0],
        totalEvents: eventsData.length,
        eventsByCategory: {},
        eventsByType: {},
        topEvents: [],
        errors: {},
        generatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Categorize events
      eventsData.forEach(event => {
        const category = event.category || 'unknown';
        const eventType = event.eventType || 'unknown';

        report.eventsByCategory[category] = (report.eventsByCategory[category] || 0) + 1;
        report.eventsByType[eventType] = (report.eventsByType[eventType] || 0) + 1;

        if (event.severity === 'error') {
          report.errors[eventType] = (report.errors[eventType] || 0) + 1;
        }
      });

      // Get top 10 events
      report.topEvents = Object.entries(report.eventsByType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([eventType, count]) => ({ eventType, count }));

      // Save report
      await db.collection(ANALYTICS_COLLECTIONS.DAILY_REPORTS).doc(yesterday.toISOString().split('T')[0]).set(report);

      // Check for alerts
      await checkAnalyticsAlerts(report);

      console.log("Daily analytics report generated successfully");
      return { success: true, reportDate: report.date };
    } catch (error) {
      console.error("Error generating daily analytics report:", error);
      throw error;
    }
  }
);

/**
 * Error Rate Alert - Runs every hour
 */
exports.checkErrorRateAlert = onSchedule(
  {
    schedule: "0 * * * *", // Every hour
    timeoutSeconds: 120,
    memory: "256MB"
  },
  async (context) => {
    try {
      console.log("Checking error rate...");

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const errorSnapshot = await db.collection(ANALYTICS_COLLECTIONS.ERROR_LOGS)
        .where('timestamp', '>=', oneHourAgo)
        .get();

      const errorCount = errorSnapshot.size;
      const ALERT_THRESHOLD = 50; // Alert if more than 50 errors in an hour

      if (errorCount > ALERT_THRESHOLD) {
        await createAlert({
          type: 'high_error_rate',
          severity: 'critical',
          message: `High error rate detected: ${errorCount} errors in the last hour`,
          metadata: {
            errorCount,
            threshold: ALERT_THRESHOLD,
            timeRange: '1 hour'
          }
        });

        console.warn(`Alert: High error rate! ${errorCount} errors in the last hour`);
      }

      return { success: true, errorCount };
    } catch (error) {
      console.error("Error checking error rate:", error);
      throw error;
    }
  }
);

/**
 * Performance Degradation Alert - Runs every 30 minutes
 */
exports.checkPerformanceDegradation = onSchedule(
  {
    schedule: "*/30 * * * *", // Every 30 minutes
    timeoutSeconds: 120,
    memory: "256MB"
  },
  async (context) => {
    try {
      console.log("Checking performance metrics...");

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const metricsSnapshot = await db.collection(ANALYTICS_COLLECTIONS.PERFORMANCE_METRICS)
        .where('timestamp', '>=', thirtyMinutesAgo)
        .limit(100)
        .get();

      if (metricsSnapshot.empty) return { success: true, message: "No metrics to analyze" };

      const metrics = metricsSnapshot.docs.map(doc => doc.data());
      const avgPageLoad = metrics.reduce((sum, m) => sum + (m.pageLoadTime || 0), 0) / metrics.length;

      const ALERT_THRESHOLD = 3000; // Alert if avg page load > 3 seconds

      if (avgPageLoad > ALERT_THRESHOLD) {
        await createAlert({
          type: 'performance_degradation',
          severity: 'warning',
          message: `Performance degradation detected: Average page load time is ${avgPageLoad.toFixed(2)}ms`,
          metadata: {
            avgPageLoadTime: avgPageLoad,
            threshold: ALERT_THRESHOLD,
            sampleSize: metrics.length
          }
        });

        console.warn(`Alert: Performance degradation! Avg page load: ${avgPageLoad}ms`);
      }

      return { success: true, avgPageLoadTime: avgPageLoad };
    } catch (error) {
      console.error("Error checking performance:", error);
      throw error;
    }
  }
);

/**
 * Cleanup old analytics data - Runs daily at 3 AM UTC
 */
exports.cleanupOldAnalyticsData = onSchedule(
  {
    schedule: "0 3 * * *", // Every day at 3 AM UTC
    timeoutSeconds: 300,
    memory: "512MB"
  },
  async (context) => {
    try {
      console.log("Starting cleanup of old analytics data...");

      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const batch = db.batch();
      let deletedCount = 0;

      // Clean old events
      const eventsToDelete = await db.collection(ANALYTICS_COLLECTIONS.EVENTS)
        .where('timestamp', '<', ninetyDaysAgo)
        .limit(500)
        .get();

      eventsToDelete.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      // Clean old error logs
      const errorsToDelete = await db.collection(ANALYTICS_COLLECTIONS.ERROR_LOGS)
        .where('timestamp', '<', ninetyDaysAgo)
        .limit(500)
        .get();

      errorsToDelete.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      // Clean old performance metrics
      const metricsToDelete = await db.collection(ANALYTICS_COLLECTIONS.PERFORMANCE_METRICS)
        .where('timestamp', '<', ninetyDaysAgo)
        .limit(500)
        .get();

      metricsToDelete.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      await batch.commit();

      console.log(`Cleanup completed. Deleted ${deletedCount} old records`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error("Error cleaning up analytics data:", error);
      throw error;
    }
  }
);

/**
 * Get analytics summary - Callable function
 */
exports.getAnalyticsSummary = onCall(
  {
    enforceAppCheck: false,
    cors: true
  },
  async (request) => {
    try {
      const auth = request.auth;
      if (!auth) {
        throw new HttpsError('unauthenticated', 'Authentication required');
      }

      // Verify user is admin
      const userDoc = await db.collection('users').doc(auth.uid).get();
      if (!userDoc.exists || userDoc.data().role !== 'admin') {
        throw new HttpsError('permission-denied', 'Admin access required');
      }

      const { timeRange = 'week' } = request.data;
      const startDate = getStartDate(timeRange);

      // Fetch data
      const [eventsSnapshot, errorsSnapshot, sessionsSnapshot] = await Promise.all([
        db.collection(ANALYTICS_COLLECTIONS.EVENTS)
          .where('timestamp', '>=', startDate)
          .limit(1000)
          .get(),
        db.collection(ANALYTICS_COLLECTIONS.ERROR_LOGS)
          .where('timestamp', '>=', startDate)
          .limit(500)
          .get(),
        db.collection(ANALYTICS_COLLECTIONS.USER_SESSIONS)
          .where('startTime', '>=', startDate)
          .limit(1000)
          .get()
      ]);

      return {
        totalEvents: eventsSnapshot.size,
        totalErrors: errorsSnapshot.size,
        activeSessions: sessionsSnapshot.docs.filter(d => d.data().isActive).length,
        timeRange
      };
    } catch (error) {
      console.error("Error getting analytics summary:", error);
      throw new HttpsError('internal', error.message);
    }
  }
);

/**
 * Helper: Create alert
 */
async function createAlert(alertData) {
  try {
    await db.collection(ANALYTICS_COLLECTIONS.ALERTS).add({
      ...alertData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false
    });
  } catch (error) {
    console.error("Error creating alert:", error);
  }
}

/**
 * Helper: Check analytics alerts
 */
async function checkAnalyticsAlerts(report) {
  const { totalEvents, errors } = report;

  if (Object.keys(errors).length > 5) {
    await createAlert({
      type: 'multiple_error_types',
      severity: 'warning',
      message: `Multiple error types detected: ${Object.keys(errors).length} different error types recorded today`,
      metadata: errors
    });
  }

  if (totalEvents === 0) {
    await createAlert({
      type: 'no_events',
      severity: 'warning',
      message: 'No events recorded today. Check if tracking is working correctly.',
      metadata: { date: report.date }
    });
  }
}

/**
 * Helper: Get start date
 */
function getStartDate(timeRange) {
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
}

exports.checkAnalyticsAlerts = checkAnalyticsAlerts;
