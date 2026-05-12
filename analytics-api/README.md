This is a minimal Express-based stub server for the analytics API used by the frontend.

Usage:
1. cd analytics-api
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

Firestore integration:
- The service will attempt to initialize the Firebase Admin SDK using the following environment variables: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` (private key may need literal newlines encoded as `\n`).
- If those are present the API will read/write documents in collections such as `products` and `alerts`. When running on Render you can set these as secret env vars in the Render dashboard.

Deploy on Vercel:
1. Push this repository to the branch you configured on Vercel.
2. Ensure `vercel.json` is present (this repo contains `analytics-api/vercel.json`).
3. In Vercel dashboard, set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` (use `\n` if needed).
4. Deploy; the service will be available at the URL Vercel provides. Configure the analytics API URL in your frontend to point to that URL.
