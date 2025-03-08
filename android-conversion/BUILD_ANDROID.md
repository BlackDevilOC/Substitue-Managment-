
# Building the Android APK

This document describes how to build an Android APK for the Teacher Management System.

## Prerequisites

1. Install [Android Studio](https://developer.android.com/studio)
2. Install [Node.js](https://nodejs.org/) (v14 or higher)
3. Install React Native CLI: `npm install -g react-native-cli`

## Option 1: Using the React Native Wrapper (Recommended)

### Step 1: Set up a new React Native project

```bash
npx react-native init TeacherManagementApp
```

### Step 2: Install dependencies

```bash
cd TeacherManagementApp
npm install react-native-webview react-native-sms @react-native-community/netinfo react-native-safe-area-context
```

### Step 3: Copy the bridge files

Copy these files from the `android-conversion/react-native` directory to your React Native project:
- App.tsx
- bridge.tsx

### Step 4: Update the WebApp URL

In `bridge.tsx`, update the `WEB_APP_URL` constant to point to your deployed Replit app.

### Step 5: Build the APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be available at `android/app/build/outputs/apk/release/app-release.apk`

## Option 2: Using a WebView Wrapper (Simpler)

You can also use a tool like [WebView App Builder](https://appsgeyser.com/) or [GoNative.io](https://gonative.io/) to wrap your web app into an APK without coding.

1. Deploy your app on Replit
2. Use one of the above services to create an APK from your deployed URL
3. Customize icons, splash screens, and other app settings

## Option 3: Using Capacitor or Cordova

For more customization options:

1. Install Capacitor: `npm install @capacitor/cli @capacitor/core`
2. Initialize Capacitor: `npx cap init TeacherManagement`
3. Add Android platform: `npx cap add android`
4. Open in Android Studio: `npx cap open android`
5. Build using Android Studio
