# MyFatoorah testing

Use the **test (sandbox)** environment so no real money is charged.

## Test environment

| Use case | API base URL | Portal |
|----------|--------------|--------|
| **Test (sandbox)** | `https://apitest.myfatoorah.com` | [demo.myfatoorah.com](https://demo.myfatoorah.com) |
| **Live (Kuwait, Bahrain, Jordan, Oman)** | `https://api.myfatoorah.com` | [portal.myfatoorah.com](https://portal.myfatoorah.com) |

- Set `MYFATOORAH_BASE_URL=https://apitest.myfatoorah.com` for testing (this is the default in `.env.example`).
- For live, set `MYFATOORAH_BASE_URL=https://api.myfatoorah.com` and use your live API key.

## API key (test)

1. **Option A – Public test token**  
   MyFatoorah provides a public test token for integration testing. You can use it as in `.env.example` (commented line). **Use only in test environment.**

2. **Option B – Your own test key**  
   - Register a test account: [registertest.myfatoorah.com](https://registertest.myfatoorah.com/en/) (e.g. Kuwait, skip bank details).  
   - Ask MyFatoorah to activate your demo account and required features.  
   - In the portal: **Integration Settings → API Key** → create a key and copy it.  
   - Set `MYFATOORAH_API_KEY=<your-test-key>`.

Reference: [MyFatoorah API Key](https://docs.myfatoorah.com/docs/api-key).

## How to run a test payment

1. Set in `.env`:
   - `MYFATOORAH_BASE_URL=https://apitest.myfatoorah.com`
   - `MYFATOORAH_API_KEY=<test-token>` (or leave empty for app “demo” mode that skips real MyFatoorah).
2. Start the app, add items to cart, go to checkout, and choose MyFatoorah.
3. **Initiate**: `POST /api/payment/myfatoorah/initiate` is called with the order; you get a `paymentUrl`.
4. Complete the payment on MyFatoorah’s test page (use [test cards](https://docs.myfatoorah.com/docs/test-cards) if needed).
5. **Callback**: MyFatoorah redirects to `/api/payment/myfatoorah/callback?orderId=...&paymentId=...`; the server calls GetPaymentStatus and then redirects to success/failed.

## Go live

- Switch to live API URL and live API key (from the live portal for your country).
- See `docs/GO_LIVE.md` for full checklist.
