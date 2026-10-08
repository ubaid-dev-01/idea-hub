# Deploy — idea-hub-web

## Vercel project
- Name: `idea-hub-web`
- GitHub: https://github.com/ubaid-dev-01/idea-hub
- Root Directory: `Idea_hub-frontend`

## CLI
```bash
cd Idea_hub/Idea_hub-frontend
vercel --prod --yes
```

## Pipeline
1. Native Git: `vercel git connect https://github.com/ubaid-dev-01/idea-hub.git`
2. GitHub Actions: set secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

