# Wholly web app

The browser app uses React, JavaScript/JSX, Vite, CSS, and the Vite PWA plugin. src/App.jsx contains navigation and the account-backed Home dashboard. Feature pages call the API through src/lib/api.js.

Run pnpm --filter @wholly/web dev from the repository root. Set VITE_API_BASE_URL only when the API is hosted outside the same origin; the development proxy already forwards /api to the local API.
