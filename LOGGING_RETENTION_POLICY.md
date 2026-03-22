# Logging Retention & Archival Policy

## Overview
This document defines the retention periods, archival strategy, and compliance requirements for all logging and audit trail collections in the Ojawa eCommerce platform.

## Collections Retention Schedule

### 1. **Error Logs** (`error_logs`)
- **Retention Period**: 90 days
- **Purpose**: Application error tracking, debugging, performance monitoring
- **TTL (Time-To-Live)**: 90 days (7,776,000 seconds)
- **Archival**: After 30 days, move to Cloud Storage /logs/archived/error_logs/
- **Access**: Admins only
- **Fields Indexed**: `timestamp`, `userId`, `severity`, `endpoint`

#### Firestore TTL Configuration:
```javascript
// Enable TTL on error_logs collection
// Go to Firestore > error_logs > Add Custom Index
// Add TTL on 'expiresAt' field (set to 90 days from creation)

db.collection('error_logs').add({
  userId: 'user123',
  error: 'Payment processing failed',
  severity: 'error',
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
  // TTL: automatically delete 90 days after creation
  expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000))
});
```

### 2. **Admin Audit Logs** (`admin_audit_logs`)
- **Retention Period**: 365 days (1 year)
- **Purpose**: Admin action tracking, compliance, security investigation
- **TTL (Time-To-Live)**: 365 days (31,536,000 seconds)
- **Archival**: After 60 days, archive monthly to Cloud Storage /logs/archived/audit_logs/YYYY-MM/
- **Access**: Admins only
- **Compliance**: Required for SOC 2, GDPR audit trails
- **Fields Indexed**: `timestamp`, `userId`, `action`, `severity`

#### Logged Admin Actions:
- User role changes
- Settings modifications
- Subscription tier updates
- Commission rate changes
- Admin account lockout events
- Security policy updates
- Data exports
- System configuration changes

### 3. **Platform Events** (`platform_events`)
- **Retention Period**: 60 days
- **Purpose**: Business analytics, trend analysis, system health tracking
- **TTL (Time-To-Live)**: 60 days (5,184,000 seconds)
- **Archival**: After 30 days, move to BigQuery for long-term analytics
- **Access**: Admins, Analytics team
- **Schema Sync**: Daily sync to BigQuery `platform_events` dataset
- **Fields Indexed**: `timestamp`, `eventType`, `vendorId`, `userId`

#### Event Types:
- `subscription_created`
- `subscription_renewal`
- `payment_processed`
- `order_placed`
- `vendor_activated`
- `product_listed`
- `user_registered`
- `login_success`
- `login_failed`
- `commission_paid`
- `dispute_created`

### 4. **Request Logs** (`request_logs`)
- **Retention Period**: 30 days
- **Purpose**: API performance monitoring, DDoS detection, request tracing
- **TTL (Time-To-Live)**: 30 days (2,592,000 seconds)
- **Archival**: None (auto-delete after 30 days)
- **Access**: Ops & DevOps team
- **Fields Indexed**: `timestamp`, `endpoint`, `statusCode`, `responseTime`

#### Log Format:
```javascript
{
  requestId: 'req-12345-abcde',
  timestamp: Timestamp,
  endpoint: '/api/orders',
  method: 'POST',
  userId: 'user123',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  statusCode: 200,
  responseTimeMs: 245,
  requestSize: 1024,
  responseSize: 2048,
  errorMessage: null
}
```

### 5. **Security Audit Logs** (`security_audit_logs`)
- **Retention Period**: 180 days
- **Purpose**: Security investigation, intrusion detection, compliance
- **TTL (Time-To-Live)**: 180 days (15,552,000 seconds)
- **Archival**: After 90 days, archive to Cloud Storage /logs/archived/security/YYYY-MM/
- **Access**: Security team, Admins
- **Compliance**: Required for ISO 27001, GDPR breach investigation
- **Fields Indexed**: `timestamp`, `userId`, `severityLevel`, `eventType`

#### Logged Events:
- Failed authentication attempts (>5)
- Account lockout events
- Unauthorized access attempts
- API key rotation
- Security rule changes
- Rate limit violations
- CSRF token failures
- Context mismatch warnings (IP/user agent changes)
- Data encryption key rotations
- Permission elevation events

### 6. **Critical Errors** (`critical_errors`)
- **Retention Period**: 180 days
- **Purpose**: Incident response, root cause analysis
- **TTL (Time-To-Live)**: 180 days (15,552,000 seconds)
- **Archival**: Immediately archive to Cloud Storage + Alert operations team
- **Access**: Ops team, DevOps, Engineering leads
- **Alert**: Slack notification + PagerDuty escalation
- **Fields Indexed**: `timestamp`, `severity`, `component`, `resolveStatus`

#### Critical Error Triggers:
- Database transaction failures
- Payment processing errors
- Wallet escrow failures
- Cloud Storage access failures
- Authentication system outages
- Rate limiter circuit breaker trips
- Subscription renewal failures
- Unhandled exceptions (severity = 'critical')

## Archival Strategy

### Cloud Storage Archival Path Structure:
```
gs://ojawa-ecommerce-logs/
├── archived/
│   ├── error_logs/
│   │   ├── 2024-01/
│   │   ├── 2024-02/
│   │   └── ...
│   ├── audit_logs/
│   │   ├── 2024-01/
│   │   └── ...
│   └── security/
│       ├── 2024-01/
│       └── ...
├── export/
│   └── monthly_reports/ (for business intelligence)
└── backup/
    └── daily/ (redundancy)
```

### Archival Frequency:
- **Error Logs**: Daily (at 02:00 UTC)
- **Audit Logs**: Daily (at 02:30 UTC)
- **Security Logs**: Daily (at 02:15 UTC)
- **Request Logs**: Every 6 hours (auto-deleted, no archival needed)
- **Critical Errors**: Real-time (on creation)

### Cloud Function: Log Archival Scheduler
```javascript
// Scheduled Cloud Function for daily log archival
exports.archiveLogs = functions.pubsub
  .schedule('0 2 * * *') // 02:00 UTC daily
  .onRun(async (context) => {
    const storage = admin.storage().bucket();
    const db = admin.firestore();
    
    // Archive error logs older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const errorLogsSnapshot = await db.collection('error_logs')
      .where('timestamp', '<', thirtyDaysAgo)
      .limit(1000)
      .get();
    
    // Export to Cloud Storage
    if (!errorLogsSnapshot.empty) {
      const data = errorLogsSnapshot.docs.map(doc => doc.data());
      const filename = `archived/error_logs/${new Date().toISOString().split('T')[0]}.json`;
      await storage.file(filename).save(JSON.stringify(data, null, 2));
      console.log(`Archived ${data.length} error logs to ${filename}`);
    }
    
    // Similar process for audit_logs, security_audit_logs, etc.
  });
```

## BigQuery Integration

### Auto-Sync to BigQuery:
- **Dataset**: `ojawa_ecommerce_logs`
- **Tables**:
  - `platform_events` (synced daily)
  - `admin_audit_logs` (synced daily)
  - `error_logs` (synced weekly)
  - `security_audit_logs` (synced daily)

### Dataflow Pipeline:
```javascript
// Firestore to BigQuery streaming via Dataflow
// Triggers automatically on document creation/update

const {google} = require('googleapis');

async function streamToBigQuery(collectionName, documents) {
  const bigquery = google.bigquery('v2');
  
  const rows = documents.map(doc => ({
    json: {
      ...doc.data(),
      _batch_timestamp: new Date().toISOString(),
      _source: collectionName
    }
  }));
  
  await bigquery.tabledata.insertAll({
    projectId: process.env.FIREBASE_PROJECT_ID,
    datasetId: 'ojawa_ecommerce_logs',
    tableId: collectionName,
    requestBody: {rows}
  });
}
```

## Log Cleanup Automation

### Firestore TTL Configuration Script:
```shell
# Enable TTL on collections via Firebase Console or gcloud CLI
gcloud firestore databases update \
  --project=ojawa-ecommerce \
  --delete-protection-state=unprotected

# Configure TTL index on each collection
gcloud firestore indexes composite create \
  --collection=error_logs \
  --field-config field-path=expiresAt,order=ascending \
  --field-config field-path=timestamp,order=descending
```

### Local Cleanup (Fallback):
```javascript
// Fallback cleanup function if TTL fails
exports.cleanupExpiredLogs = functions.pubsub
  .schedule('0 3 * * *') // 03:00 UTC daily
  .onRun(async (context) => {
    const db = admin.firestore();
    const collections = ['error_logs', 'request_logs', 'platform_events'];
    
    for (const collectionName of collections) {
      const retentionDays = {
        error_logs: 90,
        request_logs: 30,
        platform_events: 60
      }[collectionName];
      
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const batch = db.batch();
      const snapshots = await db.collection(collectionName)
        .where('timestamp', '<', cutoffDate)
        .limit(500)
        .get();
      
      snapshots.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Deleted ${snapshots.size} expired documents from ${collectionName}`);
    }
  });
```

## Compliance & Legal

### Compliance Standards:
- **GDPR**: 1-year audit trail (admin_audit_logs)
- **SOC 2**: 1-year activity logs with immutable archival
- **ISO 27001**: 180-day security audit logs with encryption
- **PCI DSS**: Not applicable (Paystack handles payments)

### Data Privacy:
- **PII Handling**: Admin logs may contain user IDs; mask when exporting
- **Encryption**: All archived logs in Cloud Storage encrypted at rest (AES-256)
- **Access Control**: Firestore rules restrict log access to admins only
- **GDPR Right to Erasure**: Non-audit logs auto-deleted after retention period

### Breach Notification:
- Critical errors immediately escalate to ops team
- Security audit logs flagged for manual review if suspicious activity detected
- Monthly compliance reports generated from admin_audit_logs

## Monitoring & Alerts

### Cloud Monitoring Dashboards:

#### Error Rate Dashboard:
```javascript
// Monitor error frequency by severity
// Alert if error_logs > 100/hour

const monitoring = google.monitoring('v3');

await monitoring.projects.timeSeries.create({
  name: 'projects/ojawa-ecommerce',
  requestBody: {
    timeSeries: [{
      metric: {
        type: 'custom.googleapis.com/error_logs/rate',
        labels: {severity: 'error'}
      },
      points: [{
        interval: {endTime: new Date()},
        value: {doubleValue: errorCount}
      }]
    }]
  }
});
```

#### Security Alert Thresholds:
- Failed auth attempts > 5 in 15 min: **HIGH** alert
- Context mismatch: **MEDIUM** alert
- Rate limiter circuit breaker trip: **CRITICAL** alert
- Unauthorized data access attempt: **CRITICAL** alert

### Log Queries (Cloud Logging):

#### Find All Failed Admin Actions:
```
resource.type="cloud_firestore"
resource.labels.database="(default)"
protoPayload.request.document.fields.severity.stringValue="high"
protoPayload.request.document.fields.action.stringValue="admin_context_mismatch"
timestamp>="2024-01-01T00:00:00Z"
```

#### Analyze API Performance:
```
resource.type="cloud_run"
protoPayload.request.httpRequest.requestMethod="POST"
protoPayload.request.httpRequest.requestUrl=~"^.*/api/.*"
protoPayload.response.status<500
```

## Implementation Checklist

- [ ] Enable Firestore TTL on all collections
- [ ] Deploy `archiveLogs` Cloud Function for daily archival
- [ ] Deploy `cleanupExpiredLogs` Cloud Function as fallback
- [ ] Configure BigQuery dataset `ojawa_ecommerce_logs`
- [ ] Set up Dataflow pipeline for streaming analytics
- [ ] Create Cloud Monitoring dashboards for log monitoring
- [ ] Configure Slack/PagerDuty alerts for critical errors
- [ ] Document log access procedures for team members
- [ ] Schedule monthly compliance audit of retention policy
- [ ] Test data export and restore procedures
- [ ] Review and approve archival location quotas (estimate: 500GB/year)
- [ ] Update disaster recovery plan with log archival locations

## Cost Estimates

### Monthly Storage Costs (Estimated):
- Firestore active logs: ~50GB @ $1.25/GB = **$62.50**
- Cloud Storage archival: ~20GB @ $0.020/GB = **$0.40**
- BigQuery ingestion: ~10GB @ $6.25/GB = **$62.50**
- **Total**: ~**$125/month**

### Retention Policy Summary:
| Collection | Retention | Archival | Access | TTL |
|---|---|---|---|---|
| error_logs | 90 days | 30 days in Cloud Storage | Admins | Yes |
| admin_audit_logs | 365 days | 60 days in Cloud Storage | Admins | Yes |
| platform_events | 60 days | 30 days in BigQuery | Admins | Yes |
| request_logs | 30 days | None | Ops | Yes |
| security_audit_logs | 180 days | 90 days in Cloud Storage | Security | Yes |
| critical_errors | 180 days | Real-time archival | Ops | Yes |
