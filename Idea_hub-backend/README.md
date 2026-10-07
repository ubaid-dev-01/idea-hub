# Idea Hub — API (`@ideahub/api`)

Express / Mongoose / BullMQ backend for **Idea Hub**.

> Product: Where serious ideas become accountable products.  
> Intended host: `api.ideahub.com`

Parent docs: [../README.md](../README.md) · [../docs/](../docs/)

---

## Stack

- Node **20** · Express 4 · TypeScript (ESM)  
- MongoDB / Mongoose 8  
- Redis / BullMQ · node-cron  
- JWT auth · Firebase Admin  
- Cloudinary · Stripe · Daily.co  
- OpenAI / Gemini (validation + coach)  
- Pino logging · Helmet · rate limits  

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | `tsx watch` on `src/server.ts` |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run `dist/server.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run smoke:vercel` | Build + verify Vercel entry |
| `npm run seed:admin` | Seed/reset super admin (dev) |
| `npm run test-scanner` | Scanner smoke helper |

---

## Setup

```bash
cp .env.example .env
# Minimum: MONGODB_URI, PORT, FRONTEND_URL, JWT secrets (prod)
# Recommended: REDIS_URL, Cloudinary, Firebase Admin
npm install
npm run dev
```

Default port in `.env.example`: **4000**  
Health: `GET /health` · `GET /health/json`

Full guide: [../docs/SETUP.md](../docs/SETUP.md)  
Env comments in `.env.example` are authoritative.

---

## Structure

```
src/
├── app.ts · server.ts · bootstrap-api.ts
├── routes/          # /api/* mounts (+ ideas/* registrars)
├── models/          # Mongoose schemas
├── services/        # Domain logic, scanners, billing, coach…
├── queues/ · workers/ · jobs/
├── middleware/ · config/ · lib/
api/
└── index.ts         # Vercel serverless entry
vercel.json
```

---

## Route mounts

| Prefix | Area |
|--------|------|
| `/api/auth` | Register, login, refresh, email, password |
| `/api/users` | Profiles & social |
| `/api/ideas` | Ideas, feed, engagement |
| `/api/collections` | Collections |
| `/api/upload` | Media upload |
| `/api/behavior` | Interest signals |
| `/api/progress` | Gamification |
| `/api/coach` | AI coach |
| `/api/marketplace` | Marketplace |
| `/api/live-rooms` | Live rooms |
| `/api/subscriptions` | Stripe (+ webhook) |
| `/api/admin` | Admin |

Details: [../docs/API.md](../docs/API.md)

---

## Deploy (Vercel)

1. Root directory: `Idea_hub-backend`  
2. Framework: **Other** (`framework: null` in `vercel.json`)  
3. Atlas MongoDB + env vars (see `.env.example`)  
4. Workers/cron need a non-serverless host  

Architecture notes: [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)

---

## Related

- Features → [../docs/FEATURES.md](../docs/FEATURES.md)  
- Frontend → [../Idea_hub-frontend/README.md](../Idea_hub-frontend/README.md)  
