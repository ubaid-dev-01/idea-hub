# Deploy — idea-hub-api

## Vercel project
- Name: `idea-hub-api`
- GitHub: https://github.com/ubaid-dev-01/idea-hub
- Root Directory: `Idea_hub-backend`

## CLI
```bash
cd Idea_hub/Idea_hub-backend
vercel --prod --yes
```

## Pipeline
1. Native Git: `vercel git connect https://github.com/ubaid-dev-01/idea-hub.git`
2. GitHub Actions: set secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

