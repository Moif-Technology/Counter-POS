# Android APK Build Guide

## After Any UI Or Code Change

```bash
npm run android:build
```

This does two things:

1. Rebuilds Vite with the API URL from `.env.android`.
2. Syncs the new build into the Android project.

## Then Build APK

```bash
cd android
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
.\gradlew assembleDebug
```

## APK Location

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Copy to tablet and install. With the default `.env.android`, the tablet uses the hosted backend and does not need a backend running on the developer machine.

## API URLs

| Target | URL |
|---|---|
| Android default | `https://api.moifone.com/api` set in `.env.android` |
| Production | `https://api.moifone.com/api` set in `.env.production` |
| Optional local backend | `http://YOUR_MACHINE_IP:5010/api` set in `.env.android` |

Only use the optional local backend URL when the API is running on the same network and the tablet can reach that machine.

## Production Build

```bash
vite build --mode production
npx cap sync android
cd android && .\gradlew assembleRelease
```
