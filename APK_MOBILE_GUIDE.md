# APK / Mobile App Guide

This guide explains how to run the Expo mobile app and how to prepare an Android APK build.

## What The Mobile App Does

The mobile app is built with Expo React Native. It connects to the same Django backend as the website and desktop app.

Users can:

- Browse MSTS/Open Rails digital assets.
- View asset details.
- Login/register.
- View purchases.
- View downloads.
- Open profile/account screens.

## Mobile App Folder

Main folder:

```text
mobile/
```

Important files:

| File | Use |
| --- | --- |
| `mobile/package.json` | Mobile scripts and dependencies. |
| `mobile/app.json` | Expo app name, slug, version, Android settings. |
| `mobile/tsconfig.json` | TypeScript setup. |
| `mobile/app/_layout.tsx` | App navigation layout. |
| `mobile/app/index.tsx` | Home screen. |
| `mobile/app/assets.tsx` | Asset listing screen. |
| `mobile/app/asset/[slug].tsx` | Asset detail screen. |
| `mobile/app/login.tsx` | Login screen. |
| `mobile/app/register.tsx` | Register screen. |
| `mobile/app/profile.tsx` | Profile screen. |
| `mobile/app/purchases.tsx` | Purchases screen. |
| `mobile/app/downloads.tsx` | Downloads screen. |
| `mobile/src/lib/api.ts` | API helper for backend calls. |
| `mobile/src/components/AssetCard.tsx` | Reusable asset card UI. |

## Required Backend

Start backend first:

```bash
cd backend
.venv\Scripts\activate
python manage.py runserver
```

Backend runs at:

```text
http://localhost:8000/api
```

## Mobile API URL

For real Android emulator, use:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
```

For physical phone on same Wi-Fi, use your computer LAN IP:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000/api
```

Example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000/api
```

Also add that origin/IP to backend CORS settings if needed.

## Install Mobile Dependencies

```bash
cd mobile
npm install
```

## Run Mobile App

Start Expo:

```bash
cd mobile
npm run start
```

Run directly on Android emulator:

```bash
cd mobile
npm run android
```

Run in browser for quick preview:

```bash
cd mobile
npm run web
```

## Using Expo Go

1. Install Expo Go on your Android phone.
2. Run `npm run start` inside `mobile/`.
3. Scan the QR code.
4. Make sure phone and computer are on the same Wi-Fi.
5. Use LAN API URL in `.env`.

## APK Build

This project uses Expo. The usual modern way to create APK is EAS Build.

Install EAS CLI if not installed:

```bash
npm install -g eas-cli
```

Login to Expo:

```bash
eas login
```

Configure EAS:

```bash
cd mobile
eas build:configure
```

Build Android APK preview:

```bash
cd mobile
eas build -p android --profile preview
```

If you want an installable APK instead of AAB, make sure your EAS profile uses:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

This is normally stored in:

```text
mobile/eas.json
```

If `eas.json` does not exist yet, create it during `eas build:configure` and then adjust it.

## Production Checklist For APK

- Set production API URL.
- Check login/register.
- Check asset listing.
- Check asset detail pages.
- Check purchase/download screens.
- Replace placeholder app icons.
- Set correct app version in `mobile/app.json`.
- Test APK on a real Android device.
- Confirm backend allows the mobile app origin/IP or production domain.

## Common Problems

| Problem | Fix |
| --- | --- |
| App cannot reach backend on emulator | Use `http://10.0.2.2:8000/api`. |
| App cannot reach backend on phone | Use computer LAN IP and same Wi-Fi. |
| Login fails | Check backend is running and JWT endpoints work. |
| Products do not load | Check `EXPO_PUBLIC_API_URL`. |
| APK build asks for Expo login | Run `eas login`. |
| APK build profile missing | Run `eas build:configure` and create/update `eas.json`. |

