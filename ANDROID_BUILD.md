# Android APK Build Guide

## After any UI/code change — run this:

```bash
npm run android:build
```

This does two things:
1. Rebuilds Vite with local API (`192.168.1.144:5010`)
2. Syncs new build into Android project

## Then build APK:

```bash
cd android
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
.\gradlew assembleDebug
```

## APK location:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Copy to tablet and install. Tablet must be on same WiFi as this machine.

---

## API URLs

| Target | URL |
|--------|-----|
| Local (tablet on same WiFi) | `http://192.168.1.144:5010/api` → set in `.env.android` |
| Production | `https://api.moifone.com/api` → set in `.env.production` |

To build for production:
```bash
vite build --mode production
npx cap sync android
cd android && .\gradlew assembleRelease
```
