# Contributing — Idea Hub

## Workflow

1. Create a focused branch from `main`.
2. Keep diffs reviewable — one concern per PR.
3. Update docs when behavior or setup changes.
4. Never commit `.env`, service accounts, or private keys.

## Commit style

Use short, imperative subjects:

- `feat: add tenant-scoped invoice export`
- `fix: restore offline queue replay on reconnect`
- `docs: clarify Vercel root directory`

## Checklist before push

- [ ] Typecheck / lint passes locally
- [ ] No secrets staged
- [ ] README / docs still accurate
- [ ] Notes or screenshots for UI-heavy changes when useful

