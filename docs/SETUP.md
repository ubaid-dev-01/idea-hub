# Setup — Idea Hub

## Prerequisites

- Node.js 20.x LTS (or the version pinned by the repo)
- Package manager matching the lockfile (npm / pnpm / yarn)
- Git

## Install & run

```bash
# API
cd Idea_hub-backend
cp .env.example .env
npm install
npm run dev

# Web
cd ../Idea_hub-frontend
cp .env.example .env.local
npm install
npm run dev
```
Point `NEXT_PUBLIC_API_URL` at the API origin (no trailing slash).

## Environment

See `Idea_hub-backend/.env.example` and `Idea_hub-frontend/.env.example`. Production typically needs `MONGODB_URI`, JWT secrets, `FRONTEND_URL`, and Cloudinary keys.

Copy `.env.example` (when present) to `.env.local` / `.env`. Never commit secret files.

## Verify

1. App boots without console crashes.
2. Primary happy-path screen loads.
3. Auth / API health checks pass if present.

## Deploy notes

Prefer Vercel for Next.js frontends. Set **Root Directory** correctly for monorepos. Attach Production + Preview env vars in the host dashboard.

