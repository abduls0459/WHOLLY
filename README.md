# Wholly

Wholly is a personal dashboard for worship, study, and fitness. The active application is a JavaScript/JSX MERN app: React and Vite in the browser, an Express API, and MongoDB through Mongoose.

## Architecture

~~~text
apps/web/     React UI, CSS, Vite PWA, central API client
apps/api/     Express routes, validation, auth, Mongoose models
MongoDB       users, refresh sessions, study, fitness, and Islamic tracking
~~~

The browser talks to /api/v1. Vite proxies API requests to http://127.0.0.1:4000 during development. The API validates input and derives record ownership from the verified access token.

## Features

- Register, login, logout, session restoration, profile settings, and account-scoped access.
- Study subjects, syllabus units/topics, completion, manual sessions, a server-backed timer, analytics, and exam planning.
- Fitness water, manual step entries, body measurements, meals, workouts, and weekly workout schedules.
- Islamic prayer logs, Tahajjud, Quran reading progress, Dhikr, and personal Dhikr cards. These records sync to the account API; existing browser-saved Islamic data is migrated once when the account has no saved copy.
- The Home dashboard reads its displayed totals from saved API records.
- Qibla direction is calculated on the device. Prayer times and push reminders are not connected.

## Requirements

- Node.js 20.19 or later.
- pnpm 11.25 or later.
- A MongoDB Atlas database or a local MongoDB instance.

## Setup

1. Install dependencies:

   ~~~sh
   pnpm install --frozen-lockfile
   ~~~

2. Copy .env.example to .env. Set MONGODB_URI to your MongoDB connection string and replace JWT_ACCESS_SECRET with a private random value of at least 32 characters. In Atlas, allow the development machine's IP and create a database user with access only to the Wholly database.

   Generate a secret with:

   ~~~sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
   ~~~

3. Start the frontend and API:

   ~~~sh
   pnpm dev
   ~~~

   Open http://localhost:5173. The API listens on http://localhost:4000; its health endpoint is /api/v1/health.

For separate terminals, use pnpm --filter @wholly/api dev and pnpm --filter @wholly/web dev.

## Verification

~~~sh
pnpm test
pnpm build
~~~

The API's fast tests cover health, malformed registration, and protected-route behavior without a database. MongoDB integration tests run only when MONGODB_TEST_URI points to a dedicated database whose name ends in _test. The test suite only clears records in that database. Do not point it at a production database.

## Environment variables

| Variable | Purpose |
|---|---|
| MONGODB_URI | Main MongoDB connection string. Required before the API starts. |
| JWT_ACCESS_SECRET | Private signing secret for 15-minute access tokens; minimum 32 characters. |
| WEB_ORIGIN | Browser origin allowed by the API, such as http://localhost:5173. |
| API_PORT | API port; defaults to 4000. |
| VITE_API_BASE_URL | Optional browser API base URL; defaults to /api/v1. |
| MONGODB_TEST_URI | Optional, isolated integration-test database; database name must end in _test. |

Never commit .env or put server secrets in variables prefixed with VITE_.

## Legacy PostgreSQL data

The former PostgreSQL SQL migrations are kept in packages/database/migrations; they are not used by the active app and are never run automatically. Existing PostgreSQL records are not copied automatically. See the migration notes in docs/postgresql-to-mongodb.md before moving any existing data.

## Current limitations

Prayer-time calculations, external Hijri data, push reminders, and automatic browser step counting are not implemented. Prayer entries and manual fitness logs persist; prayer times are shown as unavailable. MongoDB connection and full data-flow verification require the environment variables and database described above.
