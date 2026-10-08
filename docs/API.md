# API notes

Primary surface is REST under the Express app.

- Health: `/health` and `/health/json`
- Auth: access + refresh JWT pair
- Media: Cloudinary after scanner gates
- Background scanners / cron need a long-lived Node process (not Vercel serverless alone)

