# PawBandhan

Animal rescue platform — API, web portals (customer, NGO, admin), and field rep workflows.

## Stack

- **API:** Node.js + Express (`backend_api/`)
- **Database:** PostgreSQL ([Neon](https://neon.tech))
- **Web UI:** Static portals in `web_app/` (served by the API)

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

## Deploy to GitHub

```bash
git init
git add .
git commit -m "Initial PawBandhan deploy"
git branch -M main
git remote add origin https://github.com/pawbandhan-tech/Pawbandhan.git
git push -u origin main
```

**Note:** If you lack permission on the `pawbandhan-tech` org, create the empty repo there (GitHub → New repository), then:

```bash
git remote set-url origin https://github.com/pawbandhan-tech/Pawbandhan.git
git push -u origin main
```

Current push (if created under your user): https://github.com/vdgogatememorialfoundation/Pawbandhan — transfer to the org via **Settings → Transfer ownership**.

## Deploy API + Neon (Render)

1. Push this repo to **GitHub**.
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

Usually one of these:

| Cause | Fix |
|-------|-----|
| Deploy failed / service stopped | Render → **Logs** → fix build or runtime errors |
| `DATABASE_URL` missing | Add in **Environment** → redeploy |
| Wrong health check | Use `/health` (not a path that needs the DB at boot) |
| Service sleeping (free tier) | First request after idle takes ~30s — wait and refresh |
| Custom domain not linked | Render → **Settings → Custom Domains** → add DNS records |

**Do not** commit `.env` or database passwords to GitHub. Rotate Neon credentials if they were ever exposed.

## Deploy frontend to Vercel

Project: [pawbandhan-techs-projects/pawbandhan](https://vercel.com/pawbandhan-techs-projects/pawbandhan)

1. Install CLI: `npm i -g vercel`
2. From repo root: `vercel link` → select team **pawbandhan-tech** and project **pawbandhan**
3. In Vercel **Settings → Environment Variables**, optional override if API is not on Render default URL.
4. Deploy: `vercel --prod`

`vercel.json` serves `web_app/` and proxies `/api/*` to your Render backend. **Update** the `destination` URL in `vercel.json` if your Render service name differs from `pawbandhan-api.onrender.com`.

After deploy:

- `https://pawbandhan.vercel.app/` (or your custom domain)
- `https://YOUR-VERCEL-URL/customer_auth.html`
- `https://YOUR-VERCEL-URL/admin_auth.html`

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `PORT` | No | Set by Render automatically — do not override |
| `SMTP_USER` / `SMTP_PASS` | No | Email for OTP/notifications |
