<div align="center">

# Idea Hub

**Social idea platform — Next.js web + Express API**

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-404D59?style=flat&logo=express&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

[Repository](https://github.com/ubaid-dev-01/idea-hub) · [Author](https://github.com/ubaid-dev-01) · [Portfolio](https://ubaid-dev-01.vercel.app)

</div>

---

## Overview

Idea Hub is a full-stack product for publishing, validating, and collaborating on ideas. The web app is a Next.js client with feed, engagement, AI coach, marketplace, and gamification surfaces. The API is an Express + MongoDB service with JWT auth, media scanning workers, Stripe billing hooks, and Cloudinary uploads.

## Features

- Idea feed, detail, likes, comments, and collaboration requests
- AI coach + validation engine (Groq / OpenAI / Gemini compatible)
- Marketplace listings and bids
- Gamification: XP, streaks, badges, weekly challenges
- Live idea rooms (Daily.co) with in-app chat patterns
- Content scanners for text, image, document, and video
- Stripe subscription checkout and webhook handling
- Admin dashboard and purge tooling

## Architecture

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

## Tech stack

- Frontend: Next.js, React, TypeScript, TanStack Query, GSAP, Firebase client
- Backend: Express, Mongoose/MongoDB, BullMQ/Redis, JWT, Cloudinary
- Platform: Vercel-friendly API entry, Docker-ready worker path

## Project structure

```text
Idea_hub/
├── Idea_hub-frontend/   # Next.js web app
├── Idea_hub-backend/    # Express API + workers
└── docs/
```

## Getting started

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

## Scripts

| Package | Command | Purpose |
| --- | --- | --- |
| API | `npm run dev` | Watch API |
| API | `npm run build` / `npm start` | Production build |
| API | `npm run seed:admin` | Seed super admin (dev) |
| Web | `npm run dev` / `npm run build` | Next.js |

## Documentation

| Doc | Purpose |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System shape, data flow, boundaries |
| [docs/SETUP.md](docs/SETUP.md) | Local install, env, runbook |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Branching, commits, PR checklist |
| [docs/API.md](docs/API.md) | API health, auth, and worker notes |

## Author

**M Ubaid Javaid** — Software Engineer (MERN / Next.js)

- GitHub: [https://github.com/ubaid-dev-01](https://github.com/ubaid-dev-01)
- Portfolio: [https://ubaid-dev-01.vercel.app](https://ubaid-dev-01.vercel.app)
- Email: mubaidjavaid97@gmail.com

## License

Source is published for portfolio and engineering review. Client product ownership is not implied unless stated in a case study.

