# Admin Analytics Quick Reference

## Dashboard Access
- Go to Admin Panel → Analytics Tab
- Select time range (24 hours, 7 days, 30 days)
- View KPIs, charts, and detailed metrics

## Key Metrics Explained

### Overview Tab
- **Total Events**: Sum of all tracked actions (clicks, views, purchases, etc.)
- **Event Distribution**: Breakdown by category (user, order, product, payment, vendor)
- **Session Data**: Active sessions and average session duration

### Events Tab
- **Event Categories**: Count of events by type
- **Top Events**: Most frequent actions on your platform
- **Event Timeline**: How events are distributed over time

### Performance Tab
- **Page Load Time**: How fast pages load (target: <2s)
- **FCP (First Contentful Paint)**: When first content appears (target: <1.8s)
- **LCP (Largest Contentful Paint)**: When main content loads (target: <2.5s)
- **CLS (Cumulative Layout Shift)**: Visual stability (target: <0.1)

### Conversions Tab
- **Conversion Funnels**: Track users through checkout, registration, product listing
- **Stage Breakdown**: Identify where users drop off
- **Conversion Rate**: Percentage completing each funnel

### Errors Tab
- **Error Count**: Total errors in time range
- **Error Types**: Different error categories
- **Recent Errors**: Last 10 errors with details

## Understanding KPI Cards
- **Trending Up**: Positive trend (more events, more users)
- **Trending Down**: Negative trend (fewer events, fewer users)
- Color coding: Blue (Activity), Red (Errors), Green (Users), Purple (Engagement)

## Exporting Data
1. Click Download icon
2. Choose format:
   - **JSON**: For detailed analysis, API integration
   - **CSV**: For spreadsheet/business intelligence tools
3. Data includes last selected time period

## Common Questions & Answers

### Q: Why are events so high?
**A**: High event count is normal! It means:
- Users are actively engaging with your app
- Tracking is working correctly
- May include automated events (page views, clicks)

### Q: What does "error" mean?
**A**: Errors are technical issues:
- JavaScript errors
- Failed API calls
- Timeouts
- Authentication failures

### Q: How do I reduce errors?
**A**: 
1. Click on error to see details
2. Check "Recent Errors" section
3. Note the error type and location
4. Share with development team for fixes

### Q: What about performance?
**A**: If metrics are high:
- Page Load > 3s: Optimize images/code
- FCP > 2s: Check initial HTML size
- LCP > 2.5s: Optimize main content loading
- CLS > 0.1: Fix layout shifts

### Q: Why are sessions low?
**A**: 
- Off-peak hours (night time)
- Limited user base
- Tracking not enabled in all pages
- Check performance metrics (users may be leaving due to slowness)

## Regular Check-In Schedule

### Daily (5 min)
- [ ] Check error count (should be <50)
- [ ] Check active sessions (compared to yesterday)

### Weekly (15 min)
- [ ] Review event breakdown
- [ ] Check performance metrics
- [ ] Review conversion rates
- [ ] Export data for stakeholders

### Monthly (30 min)
- [ ] Analyze trends over time
- [ ] Compare performance to previous month
- [ ] Review error patterns
- [ ] Plan optimizations

## Action Items Based on Metrics

### If Total Events are LOW
- **Possible Issues**: Tracking not implemented, users not engaged
- **Action**: Check if tracking hooks are added to main pages
- **Expected**: Typically see 1000+ events per day with active usage

### If Errors are HIGH
- **Possible Issues**: App bugs, API failures, network issues
- **Action**: Review error details, check server logs
- **Target**: <1% error rate of total events

### If Page Load is SLOW
- **Possible Issues**: Large assets, server latency, inefficient code
- **Action**: Optimize images, use CDN, enable caching
- **Target**: <2000ms average page load

### If Conversion Rate LOW
- **Possible Issues**: UI confusion, checkout friction, payment issues
- **Action**: A/B test, simplify flows, improve UX
- **Target**: Depends on your funnel, typically >30%

### If Unique Users LOW
- **Possible Issues**: Traffic drop, acquisition issues, retention
- **Action**: Check marketing campaigns, retention strategies
- **Action**: Review with marketing team

## Technical Details for Admin

### Event Categories
- **user**: Registration, login, profile updates
- **order**: Order creation, status changes, cancellations
- **product**: Views, additions to cart, purchases, reviews
- **payment**: Initiated, completed, failed
- **vendor**: Store actions, listing management
- **search**: Search queries and results
- **error**: Technical errors and exceptions

### Session Tracking
- Starts when user logs in
- Tracks all actions during session
- Ends when user logs out
- Available in "Active Sessions" metric

### Performance Standards (Web Vitals)
| Metric | Good | Poor |
|--------|------|------|
| FCP | <1.8s | >3s |
| LCP | <2.5s | >4s |
| CLS | <0.1 | >0.25 |
| Page Load | <2s | >3s |

## Alerts & Notifications

### High Error Rate
- Triggered when >50 errors in 1 hour
- Action: Check server logs, notify development team

### Performance Degradation
- Triggered when avg page load > 3 seconds
- Action: Review performance metrics, optimize resources

### No Events
- Triggered when 0 events recorded in a day
- Action: Check if tracking is enabled, verify Firestore access

## Data Privacy
- Events don't include passwords or payment details
- User IDs are anonymized if needed
- Data stored in Firestore (encrypted)
- Automatic cleanup after 90 days

## Tips for Best Results

1. **Review Weekly**: Consistent monitoring helps spot trends
2. **Take Action**: Use data to improve UX and performance
3. **Set Goals**: Target specific metrics (conversion rate, page load)
4. **Share Insights**: Report metrics to stakeholders
5. **Iterate**: A/B test improvements and measure impact
6. **Monitor Errors**: Fix bugs quickly based on error data
7. **Optimize**: Use performance data to improve speed

## Troubleshooting

### Dashboard showing "No Data"
- [ ] Wait a few minutes for data to sync
- [ ] Verify users are active in the app
- [ ] Check Firestore console for permissions
- [ ] Refresh the page

### Events not appearing
- [ ] Verify tracking hooks are added
- [ ] Check browser console for errors
- [ ] Ensure admin has proper permissions
- [ ] Check Firestore quota

### Export not working
- [ ] Try JSON format first
- [ ] Check browser file download settings
- [ ] Reduce time range if too large
- [ ] Refresh page and try again

## Resources
- [Full Setup Guide](./ADMIN_ANALYTICS_SETUP_GUIDE.md)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Web Vitals Guide](https://web.dev/vitals/)

---

Last Updated: March 12, 2026
