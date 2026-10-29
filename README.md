# Tapas Pub & Grill

Tapas Pub & Grill is an Expo Router mobile app with an Express API in `server/`.

## Download and install the Android APK

After a successful build, the latest APK is published in the repository at [`apk/TapasBar.apk`](apk/TapasBar.apk). Each push to `main` rebuilds the app and updates that file. A copy is also kept as a GitHub Actions artifact for 90 days.

1. Open the repository's **Code** tab and open the `apk` folder.
2. Select `TapasBar.apk` and use **Download raw file**.
3. Copy the APK to your Android device and open it.
4. If prompted, allow your browser or file manager to install unknown apps, then tap **Install**.

You can also download it from the [Android APK workflow](https://github.com/43011144/TapasBar/actions/workflows/android-apk.yml): select the latest successful run and download `tapasbar-android-apk` under **Artifacts**. The GitHub Actions build is for direct testing and is not a Google Play Store release. Android may require you to uninstall an earlier Actions build before installing a later one.

## Build an APK with EAS

The `preview` EAS profile also creates an internally distributable APK. With Expo/EAS access for this project, run:

```bash
npm ci
npx eas-cli build --platform android --profile preview
```

When the build finishes, use its install/download link to get the APK on your device.

## Run the app locally

1. Configure the API URL in the root `.env` file:

   ```env
   EXPO_PUBLIC_BOOKING_API_URL=http://localhost:3000
   ```

   For a physical phone, use an API address reachable from that phone instead of `localhost`.

2. Start the API (Terminal A):

   ```bash
   cd server
   npm install
   # Configure server/.env using server/.env.example and run schema.sql once.
   npm run check-db
   npm run bootstrap-manager -- you@example.com
   npm run dev
   ```

3. From the project root (Terminal B), install dependencies and start Expo:

   ```bash
   npm install
   npx expo start -c
   ```

The root `.env` must set `EXPO_PUBLIC_BOOKING_API_URL`. For a physical phone, use your computer's LAN address instead of `localhost`. Menu and logo images are in `assets/images/`.
