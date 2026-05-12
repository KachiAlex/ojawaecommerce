# Incident Response Runbook
## E-Commerce Platform Security & Operations

**Last Updated:** 2024
**Version:** 1.0
**Maintained By:** Platform Security Team

---

## Table of Contents

1. [Incident Classification](#incident-classification)
2. [Initial Response Procedures](#initial-response-procedures)
3. [Specific Incident Scenarios](#specific-incident-scenarios)
4. [Communication Protocol](#communication-protocol)
5. [Recovery Procedures](#recovery-procedures)
6. [Post-Incident Review](#post-incident-review)
7. [Escalation Matrix](#escalation-matrix)
8. [Contact Directory](#contact-directory)

---

## Incident Classification

### Severity Levels

#### 🔴 CRITICAL (Severity 1)
- **Response Time:** < 15 minutes
- **Indicators:**
  - Data breach or unauthorized access confirmed
  - Payment system compromised
  - Service completely unavailable
  - Active DDoS attack
  - Account compromise affecting multiple users

#### 🟠 HIGH (Severity 2)
- **Response Time:** < 1 hour
- **Indicators:**
  - Partial service outage
  - Unusual database activity
  - Rate limit violations (suspicious patterns)
  - Failed authentication spike
  - Memory/CPU anomalies

#### 🟡 MEDIUM (Severity 3)
- **Response Time:** < 4 hours
- **Indicators:**
  - Elevated error rates
  - Performance degradation
  - Single user access issue
  - Configuration discrepancy
  - Minor security alerts

#### 🟢 LOW (Severity 4)
- **Response Time:** < 24 hours
- **Indicators:**
  - Informational alerts
  - Non-critical log anomalies
  - Documentation gaps
  - Maintenance requirements

---

## Initial Response Procedures

### Immediate Actions (First 5 Minutes)

1. **Acknowledge & Classify**
   - Confirm incident receipt
   - Assign severity level
   - Create incident ticket (Jira/GitHub Issues)
   - Start incident timer

2. **Alert Team**
   - Notify on-call engineer (see Escalation Matrix)
   - Post to #incidents Slack channel
   - Include severity, initial symptoms, assigned responder

3. **Document Timeline**
   - Record detection time
   - Note who discovered incident
   - Capture initial error messages/logs
   - Create incident ID (INCIDENT-YYYYMMDD-XXXX)

### Assessment Phase (Next 10-15 Minutes)

**For All Incidents:**

```bash
# 1. Check system status
curl https://api.ojawa-ecommerce.com/health

# 2. Check Firebase status
firebase status --token $FIREBASE_TOKEN

# 3. Check Render server status
curl https://ojawa-backend.onrender.com/health

# 4. Check error logs
# Access Firestore error_logs collection:
# - Filter by timestamp > now - 1 hour
# - Look for spike in error_count
# - Note error patterns and affected endpoints

# 5. Check security logs
# Access Firestore security_audit_logs collection:
# - Recent failed authentication attempts
# - Admin actions during incident window
# - Rate limit violations
```

**Query Templates:**

```javascript
// Critical errors in last hour
db.collection('error_logs')
  .where('level', '==', 'CRITICAL')
  .where('timestamp', '>', Date.now() - 3600000)
  .limit(50)
  .get()

// Failed auth attempts
db.collection('security_audit_logs')
  .where('event', '==', 'failed_login')
  .where('timestamp', '>', Date.now() - 3600000)
  .orderBy('timestamp', 'desc')
  .limit(100)
  .get()

// Active rate limit violations
db.collection('request_logs')
  .where('statusCode', '==', 429)
  .where('timestamp', '>', Date.now() - 600000)
  .get()
```

---

## Specific Incident Scenarios

### Scenario 1: Payment Service Down

**Detection Indicators:**
- Paystack webhook failures
- High error rate on `/checkout` endpoint
- Users report payment failures
- Flutterwave integration errors

**Response Steps:**

1. **Initial (0-5 min)**
   - Severity: CRITICAL
   - Disable payment gateway triggering (feature flag)
   - Notify payment provider support (Paystack/Flutterwave)
   - Post maintenance banner: "Payment processing temporarily unavailable"

2. **Diagnosis (5-20 min)**
   ```bash
   # Check Paystack API status
   curl https://api.paystack.co/health
   
   # Check webhook logs
   db.collection('webhook_logs')
     .where('provider', '==', 'paystack')
     .where('timestamp', '>', Date.now() - 3600000)
     .orderBy('timestamp', 'desc')
     .get()
   
   # Check failed transactions
   db.collection('transactions')
     .where('status', '==', 'failed')
     .where('timestamp', '>', Date.now() - 3600000)
     .get()
   ```

3. **Mitigation (20-30 min)**
   - If external provider issue:
     - Switch to fallback payment method if available
     - Or pause checkout, queue orders
   - If API key expired:
     - Rotate API keys (see Secret Management section)
     - Test webhook connectivity
   - If network issue:
     - Check Cloud Functions logs
     - Check CORS configuration
     - Verify firewall rules

4. **Recovery (30-60 min)**
   - Re-enable payment processing
   - Process queued orders
   - Notify affected users of recovery
   - Send transaction status updates

5. **Follow-up (24 hours)**
   - Incident review meeting
   - Add monitoring alert if not present
   - Document root cause

**Related Links:**
- Paystack Dashboard: https://dashboard.paystack.com
- Flutterwave Dashboard: https://app.flutterwave.com/dashboard
- Payment troubleshooting guide: See BANKING_PARTNER_ESCROW_INTEGRATION.md

---

### Scenario 2: Database (Firestore) Unavailable

**Detection Indicators:**
- Read/write operations failing
- "Firebase service temporarily unavailable" errors
- Product listings not loading
- Order history not accessible

**Response Steps:**

1. **Immediate (0-5 min)**
   - Severity: CRITICAL
   - Check Google Cloud status page: https://status.cloud.google.com/
   - Enable read-only cache for product listings
   - Post status update

2. **Diagnosis (5-15 min)**
   ```bash
   # Check Firebase console
   firebase firestore:list --project=ojawa-ecommerce
   
   # Check for quota issues
   # Look for: "Quota exceeded for..." errors
   
   # Check for billing alerts
   # Go to console.cloud.google.com/billing
   
   # Monitor collection size
   firebase firestore:delete --project=ojawa-ecommerce \
     --recursive --shallow (do NOT run - for reference only)
   ```

3. **Mitigation**
   - If quota issue:
     - Scale up Firestore capacity
     - Or implement caching layer
   - If billing issue:
     - Verify payment method on Google Cloud account
   - If regional outage:
     - Switch to read-only mode
     - Use cached data where possible

4. **Communication**
   - Post hourly updates to status page
   - Monitor Google Cloud updates
   - Coordinate with team via Slack #incidents

---

### Scenario 3: Brute Force / Account Lockout Attack

**Detection Indicators:**
- Alert: "> 100 failed auth attempts from single IP"
- Account lockout notifications from users
- Spike in `/login` 401 errors
- Spike in `failed_login` events in audit logs

**Response Steps:**

1. **Immediate (0-5 min)**
   - Severity: HIGH
   - Identify attacking IP addresses
   - Enable stricter rate limiting (5 req/min from affected IPs)
   - Notify affected users (email template: "Account Security Alert")

2. **Diagnosis**
   ```javascript
   // Query failed attempts
   db.collection('security_audit_logs')
     .where('event', '==', 'failed_login')
     .where('timestamp', '>', Date.now() - 3600000)
     .get()
     .then(snapshot => {
       const ipMap = {};
       snapshot.forEach(doc => {
         const ip = doc.data().ipAddress;
         ipMap[ip] = (ipMap[ip] || 0) + 1;
       });
       console.log('Top attacking IPs:', 
         Object.entries(ipMap)
           .sort((a, b) => b[1] - a[1])
           .slice(0, 10));
     });
   
   // Query locked accounts
   db.collection('users')
     .where('loginAttempts', '>=', 5)
     .get()
     .then(snapshot => {
       console.log(`${snapshot.size} accounts locked`);
     });
   ```

3. **Mitigation**
   - Block attacking IPs (update firestore.rules or WAF)
   - Or implement CAPTCHA on login
   - Send reset links to locked accounts
   - Enable 2FA for high-risk accounts (if available)

4. **Recovery**
   - Reset locked accounts: `loginAttempts = 0`
   - Send account unlock emails
   - Recommend password change
   - Monitor for repeat attempts

**Example Reset Script:**
```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

async function unlockAccounts() {
  const lockedAccounts = await db.collection('users')
    .where('loginAttempts', '>=', 5)
    .get();
  
  const batch = db.batch();
  lockedAccounts.forEach(doc => {
    batch.update(doc.ref, {
      loginAttempts: 0,
      lastAttemptTime: null,
      isLocked: false,
    });
  });
  
  await batch.commit();
  console.log(`Unlocked ${lockedAccounts.size} accounts`);
}

unlockAccounts();
```

---

### Scenario 4: Memory Leak / Performance Degradation

**Detection Indicators:**
- Response times > 5 seconds
- Server memory usage > 80%
- CPU usage spike
- Request queue backing up
- "Cannot allocate memory" errors

**Response Steps:**

1. **Immediate (0-5 min)**
   - Severity: HIGH
   - Enable read-only mode if severe
   - Scale up backend resources
   - Clear Redis cache if applicable

2. **Diagnosis**
   ```bash
   # Check Cloud Functions memory usage
   gcloud functions describe uploadProductImage \
     --region us-central1 --project ojawa-ecommerce
   
   # Check Render server logs
   # Dashboard: https://dashboard.render.com/
   
   # Monitor in real-time
   watch -n 1 'curl https://ojawa-backend.onrender.com/health | jq'
   ```

3. **Investigation**
   - Check for memory-intensive operations:
     - Large image processing
     - Bulk data exports
     - Unoptimized queries
   - Review recent deployments
   - Look for new dependencies with memory issues

4. **Mitigation**
   - Restart Cloud Functions
   - Optimize queries (add indexes)
   - Implement pagination for large result sets
   - Reduce batch size for bulk operations

5. **Recovery**
   - Monitor memory for 30 minutes
   - Gradually return to normal operations
   - Schedule deeper investigation

---

### Scenario 5: Unauthorized Data Access / Potential Breach

**Detection Indicators:**
- Unusual read patterns on sensitive collections
- Downloads of large user datasets
- Access from unexpected IPs
- Suspicious query patterns in audit logs

**Response Steps:**

1. **Immediate (0-5 min)**
   - Severity: CRITICAL
   - **PRESERVE EVIDENCE** - Do not delete any logs
   - Temporarily disable external API access
   - Rotate all API keys and secrets
   - Notify security team and management

2. **Diagnosis - DO NOT MODIFY DATA**
   ```javascript
   // Query access logs
   db.collection('security_audit_logs')
     .where('event', '==', 'data_access')
     .where('timestamp', '>', Date.now() - 24*3600000)
     .orderBy('timestamp', 'desc')
     .limit(1000)
     .get();
   
   // Check authentication activity
   db.collection('security_audit_logs')
     .where('event', '==', 'login')
     .where('timestamp', '>', Date.now() - 24*3600000)
     .orderBy('timestamp', 'desc')
     .get();
   
   // Identify sensitive data accessed
   db.collection('request_logs')
     .where('endpoint', 'in', ['/user/:id', '/user/data', '/admin/users'])
     .where('timestamp', '>', Date.now() - 24*3600000)
     .get();
   ```

3. **Investigation (Forensic)**
   - Determine what data was accessed
   - Identify affected user accounts
   - Check if data was exfiltrated
   - Review system logs for access vectors
   - Check for privilege escalation
   - Verify firewall and security group rules

4. **Containment**
   - Revoke compromised tokens
   - Change database access credentials
   - Review and restrict IAM roles
   - Enable additional logging/monitoring
   - Consider enabling encryption at rest (if not already enabled)

5. **Notification (If Actual Breach)**
   - Follow GDPR/CCPA notification requirements
   - Contact users whose data was compromised
   - File incident report with authorities if required
   - Document timeline and affected data

**Legal Consultation Required:** Contact legal team immediately.

---

## Communication Protocol

### Slack Notifications

**Critical Incident Format:**
```
🚨 CRITICAL INCIDENT - INCIDENT-20240115-001

Service: Payment Processing
Status: DOWN
Severity: CRITICAL
Response Time: T+3min
Lead: @john.engineer

Issue: Paystack webhook failures, users unable to complete checkout
Affected: ~500 users attempting purchases
Impact: Revenue loss ~$XXXX/minute

Latest: Investigating Paystack API status, contacted support
ETA Resolution: 30-45 minutes

Next Update: 5 minutes
Slack Thread: [above message]
```

**Hourly Status Updates:**
- Time elapsed
- What was done since last update
- Current status
- ETA for resolution
- Any blockers

### External Notifications

**For Customers (if > 15 min outage):**
- Email subject: "Service Status Update - [Service Name] Temporarily Unavailable"
- Include: What's affected, why, ETA, workaround (if any)
- Send via: SendGrid/Email service
- Don't exaggerate or make excuses

**For Payment Customers (immediate):**
- Queue the order
- Send confirmation: "Payment processing temporarily delayed, will be completed ASAP"
- Retry webhook every 5 minutes
- Send status update email when restored

---

## Recovery Procedures

### Post-Incident Checklist

- [ ] Service confirmed stable for 5 minutes
- [ ] All systems passing health checks
- [ ] No new errors in last 10 minutes
- [ ] Database connections healthy
- [ ] Cache warmed up (if applicable)
- [ ] Monitoring alerts configured to catch similar issues
- [ ] Team debriefing scheduled
- [ ] Incident log posted to #incidents-resolved
- [ ] Status page updated to "Resolved"
- [ ] Customer comms sent (if needed)

### Data Recovery (if applicable)

**Firestore Snapshot Recovery:**
```bash
# List recent snapshots
gcloud firestore backups list --project=ojawa-ecommerce

# Restore from snapshot (requires special approval)
gcloud firestore restore SNAPSHOT_ID --project=ojawa-ecommerce
```

**Transaction Rollback:**
```javascript
// For compromised transactions
const admin = require('firebase-admin');
const db = admin.firestore();

async function rollbackTransaction(transactionId) {
  const txRef = db.collection('transactions').doc(transactionId);
  const txData = await txRef.get();
  
  if (!txData.exists) {
    throw new Error('Transaction not found');
  }
  
  // Create reversal transaction
  await db.collection('transactions').add({
    originalId: transactionId,
    type: 'reversal',
    amount: -txData.data().amount,
    status: 'completed',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    approvedBy: admin.auth().currentUser.uid,
  });
  
  // Update original transaction
  await txRef.update({
    status: 'reversed',
    reversalTimestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}
```

---

## Post-Incident Review

### Incident Post-Mortem (Within 48 Hours)

**Attendees:**
- Incident lead
- On-call responder
- Senior engineer
- Product/business representative

**Agenda:**
1. Timeline review (10 min)
2. Root cause analysis (15 min)
3. Impact assessment (5 min)
4. Detection & response evaluation (10 min)
5. Preventive actions (20 min)
6. Action items (5 min)

**Meeting Output:**
- Root cause clearly documented
- 3-5 actionable prevention measures
- Assigned owners and due dates
- Communication to team

**Post-mortem Template:**
```markdown
# Incident Post-Mortem: INCIDENT-20240115-001

## Executive Summary
Brief description of what happened, impact, resolution time.

## Timeline
- 14:32 - Alert triggered: High error rate on /checkout
- 14:35 - Incident created, lead assigned
- 14:38 - Root cause identified: Paystack API key expired
- 14:42 - API key rotated, service restored
- 14:45 - Incident resolved

## Root Cause
API key expiration not caught by monitoring. Key rotates every 30 days but was
last updated 45 days ago due to manual process failure.

## Impact
- 512 failed payment attempts over 13 minutes
- ~$8,400 in lost transactions
- Users reported frustration on social media (3 complaints)

## What Went Well
- Alert triggered in <2min
- Team responded quickly
- Communication to users was timely

## What Could Be Improved
- Automated API key rotation would have prevented this
- Could have better alerting on key age

## Preventive Actions
1. Implement automated secret rotation (90-day cycle) - @john [Due: Jan 31]
2. Add alert for API key age (warn at 25 days) - @jane [Due: Jan 25]
3. Document secret rotation procedures - @bob [Due: Jan 20]

## Lessons Learned
- Manual secret management is error-prone
- Need automated monitoring for credential age
```

### Implementation of Preventive Actions

Track all post-incident action items:
- Create GitHub issues for each action
- Assign to responsible engineer
- Set due dates (within 2 weeks typically)
- Mark complete after PR merge
- Celebrate prevention of future incidents

---

## Escalation Matrix

| Level | On-Call | Escalate to | Response Time |
|-------|---------|-------------|---------------|
| Severity 1 | Primary Engineer | Engineering Lead → CTO | < 15 min |
| Severity 2 | Primary Engineer | Engineering Lead | < 1 hour |
| Severity 3 | Secondary Engineer | Engineering Lead | < 4 hours |
| Severity 4 | Ticket Queue | Next available | < 24 hours |

**On-Call Rotation:**
- View current on-call: https://pagerduty.com (when implemented)
- Temporary: Check #on-call-schedule Slack channel
- Personal escalation: Via SMS + Slack if no response in 5 minutes

**Management Escalation:**
- **Severity 1 Critical:** Notify CTO, Product Manager immediately
- **Severity 2 High:** Notify Engineering Lead
- **Customer Impact:** Notify Customer Success team
- **Data Breach:** Notify Legal and Security team immediately

---

## Contact Directory

### Engineering Team

| Role | Name | Slack | Email | Phone |
|------|------|-------|-------|-------|
| Tech Lead | [Name] | @john | john@ojawa.com | +234-XXX-XXXX |
| Senior Engineer | [Name] | @jane | jane@ojawa.com | +234-XXX-XXXX |
| DevOps Lead | [Name] | @bob | bob@ojawa.com | +234-XXX-XXXX |
| Security Lead | [Name] | @carol | carol@ojawa.com | +234-XXX-XXXX |

### External Contacts

| Service | Contact | Support URL | API Status |
|---------|---------|------------|-----------|
| Paystack Support | support@paystack.com | paystack.com/contact | api.paystack.co |
| Flutterwave Support | support@flutterwave.com | flutterwave.com/support | flutterwave.com/status |
| Google Cloud Support | Support Console | console.cloud.google.com | status.cloud.google.com |
| Render Support | support@render.com | render.com/support | render-status.com |
| Firebase Support | Support Console | firebase.google.com/support | firebase.google.com/status |

### Useful Links

- **Monitoring & Logging:**
  - Firebase Console: https://console.firebase.google.com/
  - Google Cloud Logs: https://console.cloud.google.com/logs
  - Render Dashboard: https://dashboard.render.com/
  - Firestore Collections: https://console.firebase.google.com/firestore

- **Status Pages:**
  - Google Cloud: https://status.cloud.google.com/
  - Firebase: https://firebase.google.com/status
  - Render: https://render-status.com/
  - Paystack: https://paystack.statuspage.io/

- **Documentation:**
  - ERROR_HANDLING_AND_SECURITY.md (this repo)
  - BANKING_PARTNER_ESCROW_INTEGRATION.md (this repo)
  - Security hardening guide (this repo)

---

## Training & Readiness

### Quarterly Incident Response Drill

Schedule a "fire drill" incident every quarter:
1. Simulate a Severity 2 incident
2. Test team response and communication
3. Measure time to detection and resolution
4. Identify gaps in procedures
5. Update runbook based on learnings

### On-Call Handoff Checklist

Before handing off on-call duty:
- [ ] Reviewed recent incidents
- [ ] Understood current system issues
- [ ] Verified contact information is up-to-date
- [ ] Confirmed PagerDuty/alert setup
- [ ] Reviewed this runbook
- [ ] Asked incoming on-call for questions

---

## Appendices

### A. Log Query Reference

```javascript
// Get all critical errors in last 24 hours
db.collection('error_logs')
  .where('level', '==', 'CRITICAL')
  .where('timestamp', '>', Date.now() - 86400000)
  .orderBy('timestamp', 'desc')
  .get();

// Count errors by endpoint
db.collection('error_logs')
  .where('timestamp', '>', Date.now() - 3600000)
  .get()
  .then(snap => {
    const endpoints = {};
    snap.forEach(doc => {
      const ep = doc.data().endpoint;
      endpoints[ep] = (endpoints[ep] || 0) + 1;
    });
    console.table(endpoints);
  });

// Find high-impact errors (affecting many users)
db.collection('error_logs')
  .where('timestamp', '>', Date.now() - 3600000)
  .get()
  .then(snap => {
    const users = {};
    snap.forEach(doc => {
      const uid = doc.data().userId;
      users[uid] = (users[uid] || 0) + 1;
    });
    const topUsers = Object.entries(users)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    console.log('Most affected users:', topUsers);
  });
```

### B. Secret Rotation Procedure

```
MONTHLY SCHEDULE (Every 1st of Month):

1. Backup current API keys to secure location
2. Generate new API keys in:
   - Paystack dashboard
   - Flutterwave dashboard
   - Google Cloud
3. Test new keys in staging environment
4. Update environment variables:
   - Set new keys in .env.production
   - Update Google Cloud Secret Manager
5. Deploy to production (with blue-green deployment if possible)
6. Monitor error rates for 1 hour
7. Archive old keys to secure archive
8. Document rotation in incident log

Benefits:
- Limits exposure window if key leaked
- Ensures rotation process is tested regularly
- Reduces blast radius of compromised keys
```

### C. Disaster Recovery Runbook

**RTO (Recovery Time Objective):** < 4 hours
**RPO (Recovery Point Objective):** < 15 minutes

**Complete System Rebuilding:**
1. Provision new Firestore database (from backup)
2. Deploy latest Cloud Functions
3. Update DNS to point to new infrastructure
4. Verify all functionality in production-like environment
5. Switch over traffic (update Render deployments)
6. Monitor for errors for 24 hours

**Estimated Time:** 2-3 hours for experienced team

---

**Document Version History:**
- V1.0 (Jan 2024) - Initial release

**Review Schedule:** Quarterly (Q1, Q2, Q3, Q4)
**Last Reviewed:** [Date]
**Next Review:** [Date + 3 months]

---

*For questions or updates to this runbook, contact the Security team or open an issue.*
