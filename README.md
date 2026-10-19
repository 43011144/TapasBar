# Tapas Pub & Grill

Expo Router app (root) + Express/PostgreSQL API (`server/`).

## 1. API (Terminal A)
    cd server
    npm install
    # fill in server/.env (see .env.example); run schema.sql once in the Supabase SQL editor
    npm run check-db
    npm run bootstrap-manager -- you@example.com   # first manager account, once
    npm run dev                                    # http://localhost:3000

## 2. App (Terminal B, project root)
    npm install
    npx expo start -c      # press w for web

Root `.env` must contain `EXPO_PUBLIC_BOOKING_API_URL=http://localhost:3000`
(use your PC's LAN IP instead of localhost when testing on a phone).

`assets/images` holds placeholder pictures; replace `tapas-logo.jpg` and the four
files in `assets/images/menu/` with your real photos (same file names).
