# Automatic Deploy

This repo auto-deploys to Netlify on pushes to `main` using GitHub Actions.

## One-time setup
- In GitHub → Settings → Secrets and variables → Actions, add:
  - `NETLIFY_AUTH_TOKEN`: Netlify personal access token
  - `NETLIFY_SITE_ID`: Netlify site API ID (Site settings → General → Site details)

## How it works
- Workflow file: `.github/workflows/netlify-deploy.yml`
- Steps: checkout → setup Node 18 → install deps → optional `npm run build` → `netlify deploy --prod` for the repo root (`./`).

## Trigger a deploy
Push to `main`:

```powershell
git add .
git commit -m "Trigger deploy"
git push origin main
```

## Customize
- Built output directory: set `--dir=./dist` if your build emits to `dist`.
- Alternative hosting: We can add a Firebase Hosting workflow using `firebase.json`.
