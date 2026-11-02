# How to set up SalesReport AI

This guide takes a clean machine to a running app. Full details are in [README.md](README.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 1. Requirements
- Node.js 20.11+ (22 LTS recommended) and npm 10+
- Nothing else for the default SQLite database. PostgreSQL 14+ is optional.
- Optional: an OpenAI, Google Gemini or Anthropic API key for LLM summaries (a built-in engine works without one).

## 2. Local install (development)
```bash
cd salesreport-ai
npm run setup     # creates .env with random secrets, installs packages, migrates DB, seeds demo data
npm run dev       # API on http://localhost:4000, web on http://localhost:5173
```
Sign in with `demo@example.com` / `Demo@12345` (admin) or `staff@example.com` / `Staff@12345` (staff).

## 3. Production (single Node service)
```bash
npm ci
npm run env:init                 # once: creates .env with strong secrets
# edit .env: NODE_ENV=production, APP_URL=https://your-domain, TRUST_PROXY=1 behind a proxy
npm run build
npm start                        # runs migrations, serves API + web on PORT (default 4000)
```
Keep it running with PM2: `pm2 start ecosystem.config.cjs`.

## 4. Docker
```bash
cp .env.example .env             # set JWT_ACCESS_SECRET and ENCRYPTION_KEY
docker compose up -d --build     # http://localhost:4000
docker compose run --rm seed     # optional demo data
```

## 5. Cloud (Render / Railway)
- **Render:** New → Blueprint → select the repo (`render.yaml`), set `APP_URL` and `ENCRYPTION_KEY`.
- **Railway:** deploy the repo with the Dockerfile and set the variables listed in `.env.example`.

## 6. Add your own AI key
Either set `LLM_PROVIDER` + `OPENAI_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` in `.env`, or sign in as admin and open **Settings → AI provider**. Keys saved in the app are encrypted with AES-256-GCM.

## 7. Verify
- `GET /api/health` returns `{"status":"ok"}`
- `npm test`, `npm run lint`, `npm run typecheck` all pass.
