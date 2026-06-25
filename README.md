# Field Salesperson Tracking & Analytics Platform

Real-time GPS tracking, office geofencing, stop detection and movement analytics
for a field sales team — with live admin visibility. Built to the supplied spec:
**not** a CRM/ERP/attendance system; focused purely on movement tracking and
analytics, and designed to scale from 100 to 10,000+ employees.

```
field-tracking-platform/
├── backend/   Node + Express + TypeScript · MongoDB · Socket.IO · cron workers   ✅ builds
├── admin/     React + TypeScript · Vite · live Google Map dashboard               ✅ builds
├── mobile/    React Native + TypeScript · adaptive background tracking (source)
└── docs/      ARCHITECTURE.md — the 24 architecture deliverables
```

## Status / honesty note

- **`backend/`** and **`admin/`** are complete and **compile cleanly** (`tsc` +
  production build). You can run them today.
- **`mobile/`** is complete, idiomatic source. It is **not compiled here** because
  this build environment has no native iOS/Android toolchain. Follow
  `mobile/README.md` to drop it into a `react-native init` project and build on
  your machine. It is verified by construction, not by an on-device run.
- A genuinely store-ready app (signing, OEM battery-saver hardening, device QA on
  real handsets) is engineering work beyond a code drop — this gives you a
  correct, well-structured foundation to take there.

## Quick start

### 1. Backend

```sh
cd backend
cp .env.example .env          # set JWT secrets + MONGODB_URI
npm install
npm run seed                  # creates the office + ONE bootstrap admin
npm run dev                   # http://localhost:4000  (GET /health)
```

The seed creates only an **admin** (default `admin@vmukti.com` / `Admin@12345`,
override via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env`). After signing
in, the admin adds salespeople from the dashboard's **Team** page — each gets a
name, email and password to use in the mobile app. Locked out of an existing
admin? Set `SEED_ADMIN_RESET=true` and re-run `npm run seed` to reset its password.

### 2. Admin dashboard

```sh
cd admin
cp .env.example .env          # set VITE_GOOGLE_MAPS_API_KEY (restricted key)
npm install
npm run dev                   # http://localhost:5173 (proxies API+WS to :4000)
```

### 3. Mobile app

See `mobile/README.md` — bootstrap a RN 0.76 project, copy `src/` + root files,
apply `mobile/native-setup/{ANDROID,IOS}.md`, set `API_BASE`, then
`npm run android` / `npm run ios`.

## Security reminder

The Google Maps key and Mongo URI you shared are in `.env.example` placeholders.
**Rotate and restrict the Maps key** in Google Cloud Console (lock to your app's
package/bundle + the specific APIs), and keep real secrets in `.env`/CI only —
never commit them.

## Where things live

| You want to…                         | Look at |
| ------------------------------------ | ------- |
| Understand the whole design          | `docs/ARCHITECTURE.md` |
| Change geofence radius / cadence     | `backend/.env` (`*_RADIUS_M`, `*_INTERVAL`, thresholds) |
| See the ingest + analytics pipeline  | `backend/src/services/location.service.ts` |
| See stop detection                   | `backend/src/workers/stopDetection.worker.ts` |
| See the live map                     | `admin/src/components/LiveMap.tsx` |
| See adaptive background tracking     | `mobile/src/services/location/BackgroundTracker.ts` |
| See offline sync                     | `mobile/src/services/offline/OfflineQueue.ts` |
```
