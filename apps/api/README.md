# Wholly API

JavaScript ES module API built with Express 5 and Mongoose. The app.js module exports the app for tests; server.js connects to MongoDB before listening and handles graceful shutdown.

All endpoints use /api/v1. Authentication uses bcrypt password hashes, 15-minute access tokens held in memory by the browser, and rotating refresh tokens stored as hashes in HttpOnly cookies. Study, Fitness, Islamic tracking, and profile requests are scoped to the verified user id.

Set MONGODB_URI, JWT_ACCESS_SECRET, WEB_ORIGIN, and optionally API_PORT in the repository root .env. Run pnpm --filter @wholly/api dev to start the API. pnpm --filter @wholly/api test runs API tests; database integration tests need MONGODB_TEST_URI for a disposable _test database.
