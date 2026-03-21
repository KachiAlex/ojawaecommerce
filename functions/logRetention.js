/**
 * Log Retention & Cleanup Manager
 * Handles automatic cleanup and archival of logs based on retention policies
 */

const admin = require('firebase-admin');
const db = admin.firestore();

// Default retention policies (in days)
const RETENTION_POLICIES = {
  error_logs: 90,                    // Keep error logs for 3 months
  security_audit_logs: 180,          // Keep security logs for 6 months
  request_logs: 30,                  // Keep request logs for 1 month
  platform_events: 90,               // Keep platform events for 3 months
  critical_errors: 365,              // Keep critical errors for 1 year
  admin_audit_logs: 365,             // Keep admin logs for 1 year
  user_sessions: 30,                 // Keep session logs for 1 month
};

// Archive destinations
const ARCHIVE_BUCKET = 'ojawa-logs-archive';

class LogRetentionManager {
  /**
   * Clean up expired logs based on retention policies
   */
  static async cleanupExpiredLogs() {
    const results = {
      cleaned: {},
      failed: {},
      timestamp: new Date().toISOString(),
    };

    for (const [collection, retentionDays] of Object.entries(RETENTION_POLICIES)) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const snapshot = await db.collection(collection)
          .where('timestamp', '<', cutoffDate)
          .limit(1000) // Process in batches
          .get();

        if (snapshot.empty) {
          results.cleaned[collection] = 0;
          continue;
        }

        // Delete logs in batch
        const batch = db.batch();
        let count = 0;

        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          count++;
        });

        await batch.commit();
        results.cleaned[collection] = count;

        console.log(`Cleaned ${count} documents from ${collection}`);
      } catch (error) {
        results.failed[collection] = error.message;
        console.error(`Failed to clean ${collection}:`, error.message);
      }
    }

    // Log cleanup activity
    await db.collection('admin_audit_logs').add({
      event: 'LOG_CLEANUP',
      details: results,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      severity: 'info',
    });

    return results;
  }

  /**
   * Archive old logs to Cloud Storage before deletion
   */
  static async archiveOldLogs(collection, retentionDays = 90) {
    try {
      const bucket = admin.storage().bucket(ARCHIVE_BUCKET);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const snapshot = await db.collection(collection)
        .where('timestamp', '<', cutoffDate)
        .orderBy('timestamp')
        .limit(10000)
        .get();

      if (snapshot.empty) {
        return { archived: 0, failed: 0 };
      }

      // Convert to JSONL format for efficient archival
      const logs = snapshot.docs.map(doc => JSON.stringify({
        id: doc.id,
        ...doc.data(),
      })).join('\n');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${collection}/${cutoffDate.getFullYear()}-${cutoffDate.getMonth() + 1}/${timestamp}.jsonl`;
      
      await bucket.file(filename).save(logs);

      console.log(`Archived ${snapshot.size} documents to gs://${ARCHIVE_BUCKET}/${filename}`);

      return {
        archived: snapshot.size,
        failed: 0,
        location: `gs://${ARCHIVE_BUCKET}/${filename}`,
      };
    } catch (error) {
      console.error(`Failed to archive ${collection}:`, error.message);
      return { archived: 0, failed: 1, error: error.message };
    }
  }

  /**
   * Get retention status for all collections
   */
  static async getRetentionStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      collections: {},
    };

    for (const [collection, retentionDays] of Object.entries(RETENTION_POLICIES)) {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const totalCount = await db.collection(collection).count().get();
        const expiredCount = await db.collection(collection)
          .where('timestamp', '<', cutoffDate)
          .count()
          .get();

        status.collections[collection] = {
          retentionDays,
          totalDocuments: totalCount.data().count,
          expiredDocuments: expiredCount.data().count,
          cutoffDate: cutoffDate.toISOString(),
          percentageExpired: totalCount.data().count > 0
            ? Math.round((expiredCount.data().count / totalCount.data().count) * 100)
            : 0,
        };
      } catch (error) {
        status.collections[collection] = {
          error: error.message,
        };
      }
    }

    return status;
  }

  /**
   * Update retention policy for a collection
   */
  static async updateRetentionPolicy(collection, retentionDays) {
    if (!RETENTION_POLICIES.hasOwnProperty(collection)) {
      throw new Error(`Unknown collection: ${collection}`);
    }

    const oldPolicy = RETENTION_POLICIES[collection];
    RETENTION_POLICIES[collection] = retentionDays;

    // Log policy change
    await db.collection('admin_audit_logs').add({
      event: 'RETENTION_POLICY_UPDATED',
      details: {
        collection,
        oldPolicy: oldPolicy,
        newPolicy: retentionDays,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      severity: 'warn',
    });

    console.log(`Updated retention policy for ${collection}: ${oldPolicy} → ${retentionDays} days`);

    return {
      collection,
      oldPolicy,
      newPolicy: retentionDays,
    };
  }

  /**
   * Export logs for audit/compliance
   */
  static async exportLogsForCompliance(collection, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const snapshot = await db.collection(collection)
        .where('timestamp', '>=', start)
        .where('timestamp', '<=', end)
        .orderBy('timestamp')
        .get();

      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Save to Cloud Storage
      const bucket = admin.storage().bucket(ARCHIVE_BUCKET);
      const filename = `compliance/${collection}-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.json`;
      
      await bucket.file(filename).save(JSON.stringify(logs, null, 2));

      console.log(`Exported ${logs.length} documents to gs://${ARCHIVE_BUCKET}/${filename}`);

      return {
        exported: logs.length,
        location: `gs://${ARCHIVE_BUCKET}/${filename}`,
        period: { start: start.toISOString(), end: end.toISOString() },
      };
    } catch (error) {
      console.error(`Failed to export logs:`, error.message);
      throw error;
    }
  }
}

/**
 * Schedule log cleanup (Firebase Cloud Scheduler)
 * Call this function once per day via Cloud Scheduler
 */
async function scheduleLogCleanup() {
  return LogRetentionManager.cleanupExpiredLogs();
}

/**
 * Schedule log archival (Firebase Cloud Scheduler)
 * Call this function once per week via Cloud Scheduler
 */
async function scheduleLogArchival() {
  const results = {};

  for (const collection of Object.keys(RETENTION_POLICIES)) {
    results[collection] = await LogRetentionManager.archiveOldLogs(collection);
  }

  return results;
}

module.exports = {
  LogRetentionManager,
  RETENTION_POLICIES,
  scheduleLogCleanup,
  scheduleLogArchival,
};
