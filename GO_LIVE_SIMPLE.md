# Get BILYAR Live – Simple Steps

You only need to do **one** of the options below. Pick what you use.

---

## Option A: You use Replit (easiest if your project is there)

1. Open your BILYAR project on **Replit**.
2. Click **Deploy** (or "Run" then deploy).
3. In the deploy settings, add your **custom domain** (the one you bought).
4. Add these in **Secrets** (or Environment):
   - `FIREBASE_PROJECT_ID` = `bilyar`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = paste your whole service account JSON (from the file `bilyar-service-account.json`) as one line.
5. Deploy. Your site will be live at your domain.

---

## Option B: Use Render.com (free tier, no Replit)

### Step 1: Put your code on GitHub

- If you don’t have a GitHub account, create one at github.com.
- Create a new repository, then upload your BILYAR project folder (or connect your existing repo).

### Step 2: Create the app on Render

1. Go to **https://render.com** and sign in (or create an account).
2. Click **New +** → **Web Service**.
3. Connect your **GitHub** account if asked, then select your **BILYAR repository**.
4. Use these settings (Render may fill some from the repo):
   - **Name:** `bilyar`
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm start`
5. Click **Advanced** and add **Environment Variables**. Add these one by one:

| Name | Value |
|------|--------|
| `NODE_ENV` | `production` |
| `FIREBASE_PROJECT_ID` | `bilyar` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Paste the entire contents of your `bilyar-service-account.json` file as one line (minified, no line breaks). |

6. Click **Create Web Service**. Wait for the first deploy to finish (a few minutes).

### Step 3: Add your domain

1. In your Render service, open **Settings** → **Custom Domains**.
2. Click **Add Custom Domain** and enter your domain (e.g. `www.yourdomain.com` or `yourdomain.com`).
3. Render will show you what to set at your domain provider (e.g. a CNAME or A record). Copy that and add it where you manage your domain (Replit Domains, Cloudflare, or your registrar). Save.
4. Wait a few minutes. Render will get an SSL certificate automatically. Your site will be live at your domain.

---

## Option C: Use Railway (alternative to Render)

1. Go to **https://railway.app** and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → choose your BILYAR repo.
3. After it deploys, open the service → **Variables** and add:
   - `NODE_ENV` = `production`
   - `FIREBASE_PROJECT_ID` = `bilyar`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = (paste your service account JSON as one line).
4. In **Settings** → **Networking** → **Generate Domain** (or add your custom domain and follow the DNS instructions).

---

## Where to get the Firebase JSON (one line) for FIREBASE_SERVICE_ACCOUNT_JSON

**Easy way:** In your project folder, open Terminal and run:
```bash
node scripts/prepare-firebase-env.js
```
Then copy the single line it prints and paste that as the value for `FIREBASE_SERVICE_ACCOUNT_JSON` in Render/Railway/Replit.

**Or:** Open the file **`bilyar-service-account.json`** in your project in a text editor, copy everything, then use a site like jsonformatter.org to “Minify” it to one line, and paste that as `FIREBASE_SERVICE_ACCOUNT_JSON`.

---

## After you’re live

- Visit **https://yourdomain.com** to see the store.
- Visit **https://yourdomain.com/admin** and log in with `admin@bilyar.com` / `admin` to manage orders and products.
- For real payments (Deema/MyFatoorah), add the API keys in the same Environment/Secrets section and, for Deema, set the webhook URL to `https://yourdomain.com/api/payment/deema/webhook` in the Deema portal.

If you tell me which option you use (Replit, Render, or Railway), I can give you the exact clicks for that one.
