# Hostinger hPanel Node.js Deployment (GitHub) for crossword.network

This folder documents the production deployment setup for Hostinger **Node.js App** (hPanel) using **GitHub**.

## Target Server Layout

- Web root (static): `~/domains/crossword.network/public_html`
- Node.js app root (this repo): `~/domains/crossword.network/nodeapp`

The Node.js app should run from `nodeapp` and the domain should be mapped/proxied to it via Hostinger’s Node.js app manager.

## Hostinger Node.js App Settings (Recommended)

- **Application root**: `~/domains/crossword.network/nodeapp`
- **Node version**: 18+ (20 is fine)
- **Build command** (optimized):
  - `npm ci && npm run build:hostinger`
- **Start command**:
  - `npm run start`

Notes:
- `build:hostinger` runs `npm test`, `next build`, then prunes dev deps and deletes `.next/cache` to reduce disk usage.
- If Hostinger build CPU is tight, you can switch build to: `npm ci && npm run build && npm prune --omit=dev && rm -rf .next/cache`
  - and run `npm test` in CI before deploy.

## Required Environment Variables (Production)

Set these in Hostinger hPanel → Node.js App → Environment Variables.

### Core
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_URL=https://crossword.network`
- `NEXT_TELEMETRY_DISABLED=1`
- Optional (if RAM is tight): `NODE_OPTIONS=--max-old-space-size=512`

### Auth (NextAuth)
- `NEXTAUTH_URL=https://crossword.network`
- `NEXTAUTH_SECRET=...`

### Database
- `DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE`

### Email (Resend)
- `RESEND_API_KEY=...`
- `EMAIL_FROM=Crossword Network <noreply@crossword.network>`

### Google Sign-In
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`

### Runtime Bind (Hostinger)
- `BIND_HOST=127.0.0.1`
- `PORT` is typically injected by Hostinger automatically.

## DB Schema Changes (Production)

Production DB is currently **not Prisma-baselined**, so `prisma migrate deploy` will fail with `P3005` on a non-empty DB.

Use direct SQL migrations:

```bash
npx prisma db execute \
  --file prisma/migrations/20260209_add_hint_usage_events/migration.sql \
  --schema prisma/schema.prisma
```

## Post-Deploy Verification

Run the smoke check (requires DB access from the runtime environment):

```bash
npx tsx scripts/predeploy-smoke.ts
```

Expected output includes:
- tables exist: `puzzles`, `user_progress`, `hint_usage_events`
- at least 1 puzzle exists
- hint usage event insert/delete works
