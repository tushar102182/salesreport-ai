# Deployment guide

SalesReport AI deploys as **one Node.js service**: the API serves the built React app from `apps/web/dist`. Health check: `GET /api/health`.

Before any production deploy:

- Generate secrets: `openssl rand -base64 48` → `JWT_ACCESS_SECRET`, `openssl rand -hex 32` → `ENCRYPTION_KEY` (back it up — stored API keys can't be decrypted without it).
- Set `NODE_ENV=production`, `APP_URL=https://your-domain` (enables Secure cookies + HSTS) and `TRUST_PROXY=1` when behind a proxy/load balancer.
- Keep `DEMO_MODE=false` unless this is a public demo (it wipes data daily). Use `SEED_DEMO_DATA=true` once if you want sample data.

---

## Render

**Blueprint (recommended):** push the repo to GitHub → Render dashboard → **New → Blueprint** → select the repo. `render.yaml` creates a Docker web service with a 1 GB persistent disk mounted at `/app/data` (SQLite).

Then set the `sync: false` variables in the dashboard:

- `APP_URL` = `https://<your-service>.onrender.com` (or your custom domain)
- `ENCRYPTION_KEY` = output of `openssl rand -hex 32`
- `OPENAI_API_KEY` (optional)

**Without Docker (Node runtime):**

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Add a disk at `/var/data` and set `DATABASE_URL=file:/var/data/salesreport.db`, or use a Render PostgreSQL database (see [Switching to PostgreSQL](CUSTOMIZATION.md#switching-to-postgresql)).

## Railway

1. **New Project → Deploy from GitHub repo**. Railway detects the `Dockerfile`.
2. Add a **Volume** mounted at `/app/data` (SQLite) — or add the PostgreSQL plugin and use its `DATABASE_URL` after switching the Prisma provider.
3. Variables: `NODE_ENV=production`, `APP_URL=https://<app>.up.railway.app`, `TRUST_PROXY=1`, `JWT_ACCESS_SECRET`, `ENCRYPTION_KEY`, optional `LLM_PROVIDER` + key, optional `SEED_DEMO_DATA=true`.
4. Networking → **Generate domain**. Railway injects `PORT`; the app listens on it automatically.

## VPS (Ubuntu 24.04) with Nginx + PM2

```bash
# 1. System packages
sudo apt update && sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2

# 2. App
sudo mkdir -p /opt/salesreport && sudo chown $USER /opt/salesreport
cd /opt/salesreport && unzip ~/salesreport-ai.zip -d . && cd salesreport-ai   # or git clone
npm run env:init                      # creates .env with random secrets
nano .env                             # NODE_ENV=production, APP_URL=https://reports.example.com,
                                      # CORS_ORIGINS=https://reports.example.com, TRUST_PROXY=1,
                                      # DATABASE_URL=file:/opt/salesreport/data/salesreport.db
mkdir -p /opt/salesreport/data
npm ci && npm run build
npm run db:migrate && npm run db:seed # seed is optional

# 3. Run with PM2 (auto-restart + boot persistence)
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup               # follow the printed command
```

**Nginx** — `/etc/nginx/sites-available/salesreport`:

```nginx
server {
    listen 80;
    server_name reports.example.com;

    client_max_body_size 12m;          # uploads are limited to 10 MB by the app

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;       # AI summaries can take a few seconds
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/salesreport /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d reports.example.com   # HTTPS
```

**Updates:** `git pull` (or unzip the new version) → `npm ci && npm run build && npm run db:migrate && pm2 restart salesreport-ai`.

**Backups (SQLite):** `sqlite3 /opt/salesreport/data/salesreport.db ".backup '/backups/salesreport-$(date +%F).db'"` in a daily cron job. Also back up `.env` (especially `ENCRYPTION_KEY`).

## Docker / docker compose

```bash
cp .env.example .env    # set JWT_ACCESS_SECRET, ENCRYPTION_KEY, APP_URL …
docker compose up -d --build
docker compose run --rm seed      # optional demo data
docker compose logs -f app
```

The image is multi-stage (build → slim runtime), runs as the non-root `node` user, applies migrations on start, has a `HEALTHCHECK`, and stores SQLite in the `/app/data` volume. Put it behind Nginx/Caddy/Traefik for HTTPS and set `TRUST_PROXY=1`.

## Public live demo (marketplace preview)

Set `DEMO_MODE=true` (and optionally `DEMO_RESET_HOUR_UTC`). The app seeds the demo company, shows the demo credentials on the login page and a banner, blocks saving API keys and changing demo passwords, and **wipes and re-seeds all data every day**. Leave `LLM_PROVIDER` without a key to avoid AI costs — the rule-based engine still produces summaries — or set a key with a low spending limit.

## Production checklist

- [ ] Strong `JWT_ACCESS_SECRET` and `ENCRYPTION_KEY`, `.env` permissions `600`, secrets backed up
- [ ] `APP_URL` uses `https://`, `TRUST_PROXY` set correctly
- [ ] `ALLOW_REGISTRATION=false` if this is a private installation
- [ ] Database backups scheduled
- [ ] `LOG_LEVEL=info` and logs shipped/rotated (`pm2 install pm2-logrotate`)
- [ ] Uptime monitor on `/api/health`
- [ ] Demo account removed or password changed if you seeded demo data
