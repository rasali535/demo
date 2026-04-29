# mAgri — Hostinger deployment guide

Your current deploy at https://palevioletred-hawk-651305.hostingersite.com/ shows the **frontend renders, but every `/api/*` call returns HTTP 500**. The fix is just **environment configuration**. The codebase is already deployment-ready (pure Node.js — no Python required after the latest refactor).

## What was changed for portable deployment

- The AI Diagnose endpoint **no longer spawns a Python process**. It now calls Emergent's OpenAI-compatible proxy via plain `fetch`. Token usage is extracted from the standard `usage` field. Means: **any host that can run Next.js can run mAgri.**
- `next.config.js` already has `output: 'standalone'` — a `Dockerfile` + a self-contained `node server.js` build are produced.

## Required environment variables (set these in Hostinger panel)

| Variable | Required | Example |
|----------|----------|---------|
| `MONGO_URL` | yes | `mongodb+srv://user:pass@cluster.mongodb.net` |
| `DB_NAME` | yes | `magri_prod` |
| `EMERGENT_LLM_KEY` | yes | `sk-emergent-...` |
| `NEXT_PUBLIC_BASE_URL` | yes | `https://palevioletred-hawk-651305.hostingersite.com` |
| `NEXT_PUBLIC_GA4_ID` | optional | `G-XXXXXXXXXX` |
| `CORS_ORIGINS` | optional | `*` |

### MongoDB — use Atlas (free tier)

1. Sign up at https://www.mongodb.com/cloud/atlas (free).
2. Create a free **M0** cluster.
3. Create a database user.
4. **Network access → add IP** → "Allow access from anywhere" (`0.0.0.0/0`) — Hostinger IPs are dynamic.
5. Click *Connect → Drivers → Node.js* and copy the connection string. **Replace `<password>`** in it.
6. Set that as `MONGO_URL` in Hostinger.

## Path A — Hostinger "Web Hosting" (Node.js plan)

If your plan supports Node.js apps (Premium / Business plans):

1. **hPanel → Websites → your site → Hosting → Advanced → Node.js**
2. Create a new Node.js app:
   - Application root: `/public_html` (or wherever you uploaded code)
   - Application URL: your domain
   - Application startup file: `node_modules/next/dist/bin/next` with arg `start` *or* if you used `output: 'standalone'`, point to `.next/standalone/server.js`
   - Node version: **20.x**
3. **hPanel → Advanced → Environment Variables** — add all variables from the table above.
4. SSH into the host (or use *File Manager*), then in the app root:
   ```bash
   yarn install --production=false
   yarn build
   ```
5. Restart the Node app from hPanel.
6. Visit `https://palevioletred-hawk-651305.hostingersite.com/api/health` — should now return `{"ok":true,...}` instead of 500.

## Path B — Hostinger VPS (recommended for production)

If you have a VPS plan, use Docker:

```bash
# 1. SSH into your VPS
ssh root@your.vps.ip

# 2. Install Docker + git
apt update && apt install -y docker.io docker-compose-plugin git

# 3. Clone your repo (or upload the project)
git clone <YOUR_REPO_URL> /opt/magri
cd /opt/magri

# 4. Create .env from template
cp .env.example .env
nano .env   # fill in MONGO_URL, EMERGENT_LLM_KEY, etc.

# 5. Build & run
docker build -t magri .
docker run -d --name magri --restart unless-stopped \
  --env-file .env -p 3000:3000 magri

# 6. Set up nginx + SSL (Caddy is easier)
apt install -y caddy
cat > /etc/caddy/Caddyfile <<EOF
palevioletred-hawk-651305.hostingersite.com {
  reverse_proxy localhost:3000
}
EOF
systemctl restart caddy
```

## Path C — Switch to Emergent's one-click deploy

Fastest option for client testing: click the **Deploy** button at the top-right of your preview environment. Emergent handles env vars, Mongo, custom domain and SSL automatically.

## Verify after deployment

```bash
curl https://YOUR-DOMAIN/api/health
# expect: {"ok":true,"service":"mAgri","time":"..."}

curl https://YOUR-DOMAIN/api/blogs | jq .posts[0].title
# expect: a blog title (not 500)

curl https://YOUR-DOMAIN/sitemap.xml | head -5
# expect: XML
```

## Demo accounts (once Mongo is connected, the seed runs automatically)

- Admin: `admin@magri.africa / admin123`
- New users start with **BWP 50** free credit

## SEO checklist after deploy

- Update `NEXT_PUBLIC_BASE_URL` to the **final** custom domain so canonical tags are correct.
- Submit `/sitemap.xml` to Google Search Console.
- Replace `NEXT_PUBLIC_GA4_ID` placeholder with your real Measurement ID.
