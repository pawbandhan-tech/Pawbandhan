# PawBandhan

Animal rescue platform — API, web portals (customer, NGO, admin), and field rep workflows.

## Canonical links

| Service | URL |
|---------|-----|
| **GitHub** | https://github.com/pawbandhan-tech/Pawbandhan |
| **Vercel** | https://vercel.com/pawbandhan-techs-projects/pawbandhan |
| **Vercel project ID** | `prj_7Ulm0bcjhPlDolg7S4gbYie4vOpT` |

## Stack

- **API:** Node.js + Express (`backend_api/`)
- **Database:** PostgreSQL ([Neon](https://neon.tech))
- **Web UI:** Static portals in `web_app/` (Vercel) or served by the API locally

## Local development

```bash
cd backend_api
cp .env.example .env
# Edit .env — set DATABASE_URL to your Neon connection string
npm install
npm start
```

Open:

- http://localhost:5000/
- http://localhost:5000/admin_portal.html
- http://localhost:5000/ngo_dashboard.html

## GitHub (`pawbandhan-tech/Pawbandhan`)

```bash
git remote set-url origin https://github.com/pawbandhan-tech/Pawbandhan.git
git push -u origin main
```

Sign in to GitHub as **pawbandhan-tech** (not a personal memorial-foundation account) to accept any pending repository transfer, then push `main`.

## Vercel (`pawbandhan-techs-projects/pawbandhan`)

1. Log in to the **pawbandhan-tech** Vercel team (not other personal teams).
2. From repo root:

```bash
npm i -g vercel
vercel login
vercel link --project prj_7Ulm0bcjhPlDolg7S4gbYie4vOpT --yes
vercel --prod
```

3. In [project Git settings](https://vercel.com/pawbandhan-techs-projects/pawbandhan/settings/git), connect **pawbandhan-tech/Pawbandhan** on GitHub.
4. Disconnect any duplicate project linked to the wrong GitHub account or team.

`vercel.json` serves `web_app/` and proxies `/api/*` to Render (`pawbandhan-api.onrender.com` by default). Update `vercel.json` if your Render service URL differs.

Production URLs (after deploy):

- https://pawbandhan.vercel.app/ (team default alias)
- `/customer_auth.html`, `/admin_auth.html`, etc.

## Deploy API + Neon (Render)

1. Push this repo to **pawbandhan-tech/Pawbandhan** on GitHub.
2. [Render](https://render.com) → **New → Blueprint** (uses `render.yaml`) or **Web Service**:
   - **Root directory:** `.` (repo root)
   - **Build:** `cd backend_api && npm install --omit=dev`
   - **Start:** `node backend_api/server.js`
   - **Health check path:** `/health`
3. **Environment** (required):
   - `DATABASE_URL` = Neon connection string (pooler, `sslmode=require`)
   - Do **not** set `PORT` manually — Render assigns it automatically.
4. After deploy succeeds, open:
   - `https://YOUR-SERVICE.onrender.com/health` → should show `{"ok":true,...}`
   - `https://YOUR-SERVICE.onrender.com/admin_portal.html`

### “Production domain is not serving traffic”

| Cause | Fix |
|-------|-----|
| Deploy failed / service stopped | Render → **Logs** → fix build or runtime errors |
| `DATABASE_URL` missing | Add in **Environment** → redeploy |
| Wrong health check | Use `/health` |
| Service sleeping (free tier) | First request after idle takes ~30s — wait and refresh |
| Custom domain not linked | Render → **Settings → Custom Domains** → add DNS records |

**Do not** commit `.env` or database passwords to GitHub. Rotate Neon credentials if they were ever exposed.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `PORT` | No | Set by Render automatically — do not override |
| `SMTP_USER` / `SMTP_PASS` | No | Email for OTP/notifications |
