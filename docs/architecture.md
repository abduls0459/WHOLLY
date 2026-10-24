# Wholly architecture

## Active application

~~~text
Browser
  React + Vite PWA (JavaScript/JSX)
        | same-origin /api/v1 requests
Express API (JavaScript ES modules)
  auth, request validation, account scoping, feature routes
        |
Mongoose models
        |
MongoDB Atlas or local MongoDB
~~~

The API lives in apps/api/src. config/database.js owns the single Mongoose connection. Models are in models/index.js. Routes handle HTTP input/output and use Mongoose queries scoped to the verified user id. middleware/errors.js provides the shared error format.

The web app lives in apps/web/src. lib/api.js is the only HTTP client. The access token stays in memory; a short-lived token is renewed from an HttpOnly, Secure-in-production, SameSite=Lax refresh cookie. Vite proxies /api to the local API during development.

## Saved data

- User and settings fields live in User documents.
- Hashed refresh tokens and their expiry/revocation state live in RefreshSession documents.
- A Subject owns its syllabus items as embedded records. Study sessions and a single active timer per account use separate collections.
- FitnessData stores one user's water, steps, measurements, meals, workouts, and weekly schedule. These records are private to that document's owner.
- IslamicData stores validated per-account tracker data. Browser localStorage is read only once to migrate an older Islamic tracker into the account when no server copy exists.
- The dashboard summarizes the authenticated user's records and settings. It does not provide prayer-time calculations.

The application connects to MongoDB before listening. Database errors do not expose raw database messages or credentials to API clients. Graceful shutdown closes the HTTP server and database connection.

## Legacy and not-yet-built areas

SQL files in packages/database/migrations describe the previous PostgreSQL schema. They are preserved for reference, but the current app has no PostgreSQL client or SQL migration runner. Existing SQL data is not automatically copied; read docs/postgresql-to-mongodb.md before planning a transfer.

apps/worker, packages/shared, and packages/data are not active runtime components. Prayer-time provider integration, push notifications, external Hijri data, offline write queues, and automatic step counting are not implemented. Qibla direction uses device location only after the user asks the browser for permission.
