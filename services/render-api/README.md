This is a minimal Express-based stub server for the Render-hosted analytics API used by the frontend.

Usage:
1. cd services/render-api
2. npm install
3. npm run start

Endpoints implemented (stubs):
- GET /health
- POST /api/analytics/buyer/overview
- POST /api/analytics/buyer/top
- POST /api/analytics/buyer/growth
- POST /api/analytics/buyer/engagement
- POST /api/analytics/buyer/repeat
- POST /api/analytics/buyer/cohort
- POST /api/analytics/buyer/abandoned
- POST /api/analytics/buyer/clv
- POST /api/analytics/buyer/retention
- GET  /api/analytics/buyer/:buyerId
- POST /api/analytics/transactions/overview
- POST /api/analytics/platform/overview

Notes:
- These endpoints return mock/sample payloads to allow frontend integration testing.
- Replace the stub logic with real database aggregations (from your migrated DB) when ready.
