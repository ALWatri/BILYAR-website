# BILYAR – Go Live Checklist

Use this checklist once you have your **domain** and are ready to take the site live.

---

## 1. Deploy the app to a host

Choose one and deploy the repo (Node.js + optional PostgreSQL or Firestore).

| Host | Best for | Notes |
|------|----------|--------|
| **Render** | Simple, free tier | New → Web Service, connect GitHub. Add PostgreSQL if not using Firebase. |
| **Railway** | Fast setup | Deploy from GitHub, add Postgres or use Firebase. |
| **Replit** | Already using it | Deploy there and use your Replit-purchased domain. |
| **VPS** (DigitalOcean, etc.) | Full control | Run `npm run build` then `npm start`; use PM2 or systemd. |

**Build & start (all hosts):**
- **Build:** `npm install && npm run build`
- **Start:** `npm start` (serves on `PORT` env, default 5000)
- **Database:** Either set `DATABASE_URL` (PostgreSQL) and run `npm run db:push` + `npm run seed`, or set `FIREBASE_PROJECT_ID` + credentials and run `npm run seed:firestore`

After deploy, note your app URL (e.g. `https://bilyar-xxxx.onrender.com`).

---

## 2. Point your domain to the host

Where you manage DNS (Replit Domains, Cloudflare, your registrar, etc.):

- **Root domain (example.com):** Add an **A** record pointing to the IP your host gives you, or a **CNAME** if the host supports it (e.g. Render “custom domain”).
- **www (www.example.com):** Add a **CNAME** record to the host’s URL (e.g. `your-app.onrender.com`).

On the host (Render/Railway/etc.), add your domain in the service settings so it serves your app and gets SSL. Wait for DNS (up to 48 hours; often minutes).

Test: `https://yourdomain.com` and `https://www.yourdomain.com` should load the site over HTTPS.

---

## 3. Set production environment variables

On your host, set these in the service **Environment** / **Config** (use your real domain and secrets).

**Required (pick one database):**

```bash
# Option A – Firebase (you already have bilyar project)
FIREBASE_PROJECT_ID=bilyar
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# Or paste JSON as one line:
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Option B – PostgreSQL
# DATABASE_URL=postgresql://user:password@host:5432/dbname
```

**App:**
```bash
NODE_ENV=production
PORT=5000
```

**Payments (optional for demo; required for real payments):**

```bash
# MyFatoorah (Card / KNET) – get production key from MyFatoorah
MYFATOORAH_API_KEY=your_live_key
MYFATOORAH_BASE_URL=https://api.myfatoorah.com

# Deema BNPL – switch to Live after Deema approves
DEEMA_API_KEY=your_live_deema_key
DEEMA_BASE_URL=https://api.deema.me
DEEMA_WEBHOOK_SECRET=your_webhook_secret_from_portal
```

**Webhook URL (important):**  
Your Deema webhook must use your **live domain**, e.g.:

`https://yourdomain.com/api/payment/deema/webhook`

Set this in the [Deema Merchant Portal](https://docs.deema.me/docs/getting-started-with-deema-bnpl-solution) and use the same secret in `DEEMA_WEBHOOK_SECRET`.

---

## 4. Payments go-live

- **MyFatoorah:** Add your **production** API key and set `MYFATOORAH_BASE_URL=https://api.myfatoorah.com` (or the URL they give you).
- **Deema:** Follow `docs/DEEMA_INTEGRATION.md`: request Live activation, then set Live `DEEMA_API_KEY`, `DEEMA_BASE_URL=https://api.deema.me`, and the same `DEEMA_WEBHOOK_SECRET` as in the Live portal. Webhook URL must be `https://yourdomain.com/api/payment/deema/webhook`. Do one test transaction and confirm the webhook is received.

---

## 5. Final checks

| Check | How |
|-------|-----|
| Homepage loads | Open `https://yourdomain.com` |
| Shop & product pages | Browse and open a product |
| Add to cart & checkout | Add item, go to checkout, fill form |
| Place test order | Use Deema or MyFatoorah (or demo mode); confirm redirect to success/failure |
| Admin | Open `https://yourdomain.com/admin`, log in (admin@bilyar.com / admin), check Orders, Products, Settings |
| Deema webhook | After a Deema payment, check host logs for “Deema webhook received” and that order status updated |
| HTTPS everywhere | No mixed content; all links use `https://` |

---

## 6. Optional next steps

- **Real admin login** – Replace mock auth (e.g. session or JWT + secure password).
- **Order emails** – Send confirmation emails to customers (e.g. Resend, SendGrid).
- **Backups** – Regular backups of Postgres or Firestore.
- **Monitoring** – Uptime check or error tracking (e.g. Sentry).

---

## Quick reference

| Item | Action |
|------|--------|
| Deploy | Push code to host; build + start; set DB (Firebase or Postgres). |
| Domain | Point DNS (A/CNAME) to host; add domain in host dashboard. |
| Env | Set `NODE_ENV`, `PORT`, DB vars, and payment keys (live when ready). |
| Deema | Live key + `DEEMA_BASE_URL=https://api.deema.me` + webhook URL = `https://yourdomain.com/api/payment/deema/webhook`. |
| MyFatoorah | Production key + production base URL. |
| Test | Browse, checkout, pay, check admin and webhook. |

Once these are done, the site is live on your domain with HTTPS and (when configured) real payments.
