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

1. Push this repo to **GitHub** (`pawbandhan-tech/Pawbandhan`).
2. In [Render](https://render.com): **New → Blueprint** or **Web Service** → connect the repo.
3. Use `render.yaml` (root dir `backend_api`, start `npm start`).
4. Set environment variable **`DATABASE_URL`** to your Neon URL (Dashboard → Connection string, pooler).
5. After deploy, open `https://YOUR-SERVICE.onrender.com/admin_portal.html`.

**Do not** commit `.env` or database passwords to GitHub. Rotate Neon credentials if they were ever shared in chat or code.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `PORT` | No | Default `5000` (Render sets `10000`) |
| `SMTP_USER` / `SMTP_PASS` | No | Email for OTP/notifications |
