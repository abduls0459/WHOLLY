# Repository audit

## Critical

- The active backend was PostgreSQL-only while the requested application required MongoDB Atlas/Mongoose. API startup did not connect/validate a database before accepting requests.
- Registration/login and all record routes used SQL connection pools and failed when PostgreSQL was unavailable.
- The Home dashboard displayed hard-coded prayer, study, water, meal, step, streak, and weekly values as if they were saved data.

## High

- Authentication and settings were implemented, but Study/Fitness depended on PostgreSQL and the Islamic tracker used account-keyed localStorage as its source of truth.
- Test setup required a live PostgreSQL database. Vitest also discovered stale compiled tests under apps/api/dist, so the baseline run repeated failures.
- App code, tests, and build configuration used TypeScript/TSX despite the JavaScript-only target.
- API settings allowed several values through the request layer that only failed later at the database boundary.

## Medium

- API errors were not handled by a shared middleware and malformed JSON could surface as a server error.
- The dashboard and feature pages did not share a real saved-data summary.
- Package manifests used latest ranges and retained TypeScript and PostgreSQL packages in the active runtime.

## Low

- README and app-specific documentation described the previous PostgreSQL/TypeScript architecture and marked already-present features as future work.
- Generated API build output and TypeScript build metadata were stale.

## Implemented in this pass

- Switched active persistence to Mongoose models for users/settings, refresh sessions, subjects and syllabus items, study sessions/timers, fitness records, and Islamic tracking.
- Added startup environment checks, one shared MongoDB connection, graceful shutdown, secure auth/session handling, centralized API errors, and origin-limited credentialed CORS.
- Ported Study/Fitness API behavior to MongoDB while keeping the existing route paths and response fields. Added account-scoped Islamic endpoints and an API-backed Home summary.
- Removed TypeScript/TSX source and configuration, converted frontend files to JS/JSX, pinned direct dependencies, and removed PostgreSQL from active scripts/dependencies.
- Replaced database-required baseline tests with isolated fast API tests and opt-in MongoDB integration tests requiring a dedicated _test database.

## Remaining verification

MongoDB-backed tests and end-to-end persistence need MONGODB_TEST_URI / MONGODB_URI. They have not been treated as passing without those services. Prayer times, push reminders, automatic steps, and transferring any existing PostgreSQL records remain out of scope for this repair pass.
