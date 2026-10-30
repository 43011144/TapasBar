# Tapas Pub & Grill

Tapas Pub & Grill is an Expo Router mobile app with an Express API in `server/`.

## Download and install the Android APK

After a successful build, the latest APK is published in the repository at [`apk/TapasBar.apk`](apk/TapasBar.apk). Each push to `main` rebuilds the app and updates that file. A copy is also kept as a GitHub Actions artifact for 90 days.

Direct download: [TapasBar.apk](https://github.com/43011144/TapasBar/raw/refs/heads/main/apk/TapasBar.apk). The APK includes its app code and does not need an Expo remote update to launch; new app changes arrive in the next APK build.

1. Open the repository's **Code** tab and open the `apk` folder.
2. Select `TapasBar.apk` and use **Download raw file**.
3. Copy the APK to your Android device and open it.
4. If prompted, allow your browser or file manager to install unknown apps, then tap **Install**. If you installed an older TapasBar build that fails with “Failed to download remote update,” uninstall it first to clear its cached update, then install the newly downloaded APK. APK files are binary installers; don’t open them as source code in VS Code.

You can also download it from the [Android APK workflow](https://github.com/43011144/TapasBar/actions/workflows/android-apk.yml): select the latest successful run and download `tapasbar-android-apk` under **Artifacts**. The GitHub Actions build is for direct testing and is not a Google Play Store release. Android may require you to uninstall an earlier Actions build before installing a later one.

## Build an APK with EAS

The `preview` EAS profile also creates an internally distributable APK. With Expo/EAS access for this project, run:

```bash
npm ci
npx eas-cli build --platform android --profile preview
```

When the build finishes, use its install/download link to get the APK on your device.

## Run the app locally

Install Node.js LTS first; it includes both `node` and `npm`. After installing, close and reopen VS Code so its terminal refreshes `PATH`, then check `node --version` and `npm --version`. If PowerShell says `npm` is not recognized, Node.js is not installed or VS Code needs to be restarted.

### Connect the Render API to hosted Supabase

The Render log `Incomplete PostgreSQL connection settings; set PGHOST` means the API received only some `PG*` database variables. In the Supabase dashboard, open **Connect**, choose **Session pooler**, and copy its URI. In Render, open the `Tapasbar-api` service's **Environment** settings and add that full URI as `DATABASE_URL` (or `SUPABASE_DB_URL`). The API prefers this URI over partial `PG*` values, so you do not need Docker or a local PostgreSQL server. Keep the URI private as a Render secret; it contains your database password. Then save the environment changes and redeploy. Run `server/schema.sql` once in the Supabase **SQL Editor** if it has not already been applied.

To use separate environment fields instead, set all five values: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE`. Do not leave a partial set without a database URL. Keep `PAYMENT_DEMO_MODE=false` on the public production API.

### Try the PayShap demo (no real payment)

The local demo simulates approval or decline and clearly marks the result as a demo. It does not contact a bank, move money, or require Yoco, Peach, or email credentials. It does require the API to connect to your Supabase PostgreSQL database; no local database or Docker is needed. It is accepted only when the booking API runs with `NODE_ENV=development` and `PAYMENT_DEMO_MODE=true`. Simulated approvals leave the order pending so they cannot be mistaken for real payments.

1. In `server/.env`, set:

   ```env
   NODE_ENV=development
   PAYMENT_DEMO_MODE=true
   ```

2. Copy the Supabase **Session pooler** connection fields from your Supabase project's **Connect** panel into `server/.env`, configure the root `.env` API URL, and run `server/schema.sql` once in the Supabase **SQL Editor**. Start the API and Expo app using the local steps below. Add a menu item to the order, open **Payment**, choose **PayShap**, and place the order.
3. Choose **Simulate bank approval** or **Simulate bank decline**. The page labels the simulation, the payment record uses method `payshap_demo`, and the order remains pending; no money is transferred.

### Configure real PayShap payments

Real PayShap checkout uses Peach Orchestration's hosted payment page. You need a Peach merchant profile with PayShap enabled, a Peach API key and profile ID, and a configured webhook. Add these secrets to `server/.env` or the API host's private environment settings; do not put them in the app bundle or commit them:

```env
PEACH_ENVIRONMENT=sandbox
PEACH_API_KEY=snd_your_peach_api_key
PEACH_PROFILE_ID=pro_your_peach_profile_id
PEACH_RETURN_URL=https://your-public-site.example.com/payment-return
PEACH_WEBHOOK_SECRET=your-random-webhook-secret-at-least-32-characters
```

Enable PayShap on the Peach business profile, then configure the Peach Orchestration webhook to `https://your-api-host.example.com/api/webhooks/peach` with the custom header `x-peach-webhook-secret` set to the same `PEACH_WEBHOOK_SECRET`. Run `server/schema.sql` against the database to apply the PayShap payment-method constraint. Set `PEACH_ENVIRONMENT=live` and use the matching `prd_` key only after Peach has enabled your live merchant profile. Peach documents PayShap's South African availability, bank limits, and one-refund limit in its [payment-method guide](https://developer.peachpayments.com/docs/pp-payment-methods); its [Orchestration guide](https://playground.peachpayments.com/integrate/hosted-checkout) documents the hosted checkout and webhook flow.

1. Configure the API URL in the root `.env` file:

   ```env
   EXPO_PUBLIC_BOOKING_API_URL=http://localhost:3000
   ```

   For a physical phone, use an API address reachable from that phone instead of `localhost`.

2. Start the API (Terminal A):

   ```bash
   cd server
   npm ci
   # Configure server/.env using server/.env.example and run schema.sql once.
   npm run check-db
   npm run bootstrap-manager -- you@example.com
   npm run dev
   ```

3. From the project root (Terminal B), install dependencies and start Expo:

   ```bash
   npm ci
   npm start -- --clear
   ```

### Start from VS Code

After dependencies are installed and the root and server `.env` files are configured, press `Ctrl+Shift+P`, choose **Tasks: Run Task**, then select **TapasBar: Start API** and **TapasBar: Start Expo**. To run the web demo, select **TapasBar: Start Web** instead. These tasks call Node directly, so they work when `node` is available but the `npm` command is missing from VS Code's `PATH`. If `npm` is not recognized, reopen VS Code after installing Node.js LTS. For web only, the app can also be started with `node ./node_modules/expo/bin/cli start --web --clear` from the project root.

The root `.env` must set `EXPO_PUBLIC_BOOKING_API_URL`. For a physical phone, use your computer's LAN address instead of `localhost`. Menu and logo images are in `assets/images/`.

The current API connects to your Supabase project's hosted PostgreSQL through the `pg` driver and Session pooler fields in `server/.env`; no local database or Docker setup is needed.
