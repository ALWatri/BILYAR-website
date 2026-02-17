# BILYAR – Firebase (Firestore) setup

The app can use **Firestore** instead of PostgreSQL. When `FIREBASE_PROJECT_ID` is set, all data (products, orders, settings) is stored in Firestore.

## 1. Create the Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Project name: **bilyar** (or any name; note the **Project ID**).
4. Disable Google Analytics if you don’t need it.
5. Create the project.

## 2. Enable Firestore

1. In the project, open **Build** → **Firestore Database**.
2. Click **Create database**.
3. Choose **Start in production mode** (the app uses the Admin SDK with a service account, not client rules).
4. Pick a region (e.g. `us-central1` or closest to your users).
5. Enable the database.

## 3. Get a service account key

1. Open **Project settings** (gear) → **Service accounts**.
2. Click **Generate new private key** and confirm.
3. Save the JSON file somewhere safe (e.g. `bilyar-service-account.json` in the project root, and add it to `.gitignore`).

## 4. Configure the app

Set environment variables so the app uses Firestore.

**Option A – Key file (local / VM)**

```bash
export FIREBASE_PROJECT_ID=bilyar
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/bilyar-service-account.json
```

**Option B – JSON in env (e.g. Render, Railway)**

1. Open the service account JSON file.
2. Minify it to a single line (no newlines).
3. Set:

```bash
FIREBASE_PROJECT_ID=bilyar
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"bilyar",...}'
```

Do **not** commit the JSON or put it in frontend code. Use the server env only.

## 5. Seed Firestore (first time)

With `FIREBASE_PROJECT_ID` and one of the credential options set:

```bash
npx tsx scripts/seed-firestore.ts
```

This creates default products and store settings. You can run it again; it skips existing data.

## 6. Run the app

- **Development:** `npm run dev`
- **Production:** `npm run build` then `npm start`

If `FIREBASE_PROJECT_ID` is set, the app uses Firestore. If not, it uses PostgreSQL (when `DATABASE_URL` is set).

## 7. Firebase CLI (optional)

To use `firebase deploy` (e.g. for Hosting or rules):

```bash
npm install -g firebase-tools
firebase login
firebase use bilyar
```

The repo includes:

- `firebase.json` – project and Firestore config
- `.firebaserc` – default project `bilyar`
- `firestore.rules` – rules (client access disabled; backend uses Admin SDK)
- `firestore.indexes.json` – indexes for queries

Deploy rules/indexes:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## Summary

| Step | Action |
|------|--------|
| 1 | Create project **bilyar** in Firebase Console |
| 2 | Enable Firestore (production mode) |
| 3 | Create and download service account JSON |
| 4 | Set `FIREBASE_PROJECT_ID` and credential (file path or `FIREBASE_SERVICE_ACCOUNT_JSON`) |
| 5 | Run `npx tsx scripts/seed-firestore.ts` |
| 6 | Start app with `npm run dev` or `npm start` |

No PostgreSQL or `DATABASE_URL` is required when using Firestore.
