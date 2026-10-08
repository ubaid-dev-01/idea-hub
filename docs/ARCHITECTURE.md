# Architecture — Idea Hub

## Intent

Idea Hub is a full-stack product for publishing, validating, and collaborating on ideas. The web app is a Next.js client with feed, engagement, AI coach, marketplace, and gamification surfaces. The API is an Express + MongoDB service with JWT auth, media scanning workers, Stripe billing hooks, and Cloudinary uploads.

## System shape

```text
Browser → Next.js (Idea_hub-frontend)
                ↓ REST + JWT
         Express API (Idea_hub-backend)
                ↓
     MongoDB · Redis/BullMQ · Cloudinary · optional Firebase Admin
                ↓
         Scanner / AI coach / Stripe / Daily.co workers
```
Monorepo layout keeps web and API as sibling packages under one git repository.

## Stack decisions

- Frontend: Next.js, React, TypeScript, TanStack Query, GSAP, Firebase client
- Backend: Express, Mongoose/MongoDB, BullMQ/Redis, JWT, Cloudinary
- Platform: Vercel-friendly API entry, Docker-ready worker path

## Boundaries

- Secrets stay in environment variables / secret managers — never in git.
- Client bundles only receive public configuration (`NEXT_PUBLIC_*` / `VITE_*`).
- Tenant or role checks belong in middleware / server layers, not UI-only gates.
- Heavy or long-running work should not run inside short-lived serverless handlers unless designed for it.

## Quality bar

- Prefer typed contracts at API and domain boundaries.
- Ship a vertical slice (auth → persisted outcome) before a broad feature surface.
- Document trade-offs in PRs when changing data models or auth.

