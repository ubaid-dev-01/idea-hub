# Idea Hub — Web (`@ideahub/web`)

Next.js frontend for **Idea Hub** — marketing site + product app.

> **Tagline:** Where serious ideas become accountable products.

Parent docs: [../README.md](../README.md) · [../docs/](../docs/)


---

## Stack

- Next.js **16.2** · React **19** · TypeScript  
- Tailwind CSS · Syne + Geist  
- TanStack Query · Zustand · Axios  
- Framer Motion · GSAP · Lottie  
- Firebase client SDK · Zod · React Hook Form  

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (`localhost:3000`) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Lint landing surfaces |
| `npm run lint:all` | Lint all of `src` |
| `npm run typecheck` | TypeScript check |
| `npm run analyze` | Bundle analyzer |

---

## Setup

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your API (e.g. http://localhost:4000)
# Add Firebase NEXT_PUBLIC_* keys
npm install
npm run dev
```

Full env & deploy steps: [../docs/SETUP.md](../docs/SETUP.md)

---

## Structure

```
src/
├── app/                  # App Router (landing, auth, main, admin)
├── components/
│   ├── brand/            # Orbit mark & OG layout
│   ├── landing/          # Marketing sections
│   ├── feed/ · idea/ …   # Product UI
│   └── …
├── lib/api/              # API clients
├── hooks/ · store/ · types/
└── data/                 # Landing content & Lottie map
public/
├── lottie/               # Landing animations
└── favicon / icon assets
```

---

## Brand

- Wordmark: **Idea Hub**  
- Mark: **Orbit** (`components/brand/IdeaHubLogo.tsx`)  
- Guide: [../docs/BRANDING.md](../docs/BRANDING.md)  

---

## Related

- Features → [../docs/FEATURES.md](../docs/FEATURES.md)  
- API client ↔ server → [../docs/API.md](../docs/API.md)  
- Backend → [../Idea_hub-backend/README.md](../Idea_hub-backend/README.md)  
