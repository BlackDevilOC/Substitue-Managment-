# Schedulizer Mobile App Update Guide

This document explains what was fixed in the mobile app configuration and how to update the app in the future.

## What Was Fixed

### 1. App Configuration (app.json)
- **Fixed the project slug**: Changed from "schedulizer-mobile" to "rest-express" to match the Expo project
- **Updated SDK version**: Set to 48.0.0 (a stable version that works well with the dependencies)
- **Removed problematic plugins**: Removed "expo-sqlite" which was causing build failures
- **Added proper Android permissions**: Added required permissions for file access and internet connectivity

### 2. Dependencies (package.json)
- **Aligned all versions**: Made sure all package versions are compatible with Expo SDK 48.0.0
- **Fixed dependency conflicts**: Resolved conflicts between different packages
- **Removed unnecessary packages**: Streamlined the dependencies to only what's needed

### 3. Build Configuration (eas.json)
- **Added proper build profiles**: Set up development, preview, and production profiles
- **Configured build channels**: Added channels for better version management
- **Added environment variables**: Set up environment variables for different build types

## How to Update the App in the Future

When you want to update the app (add features, fix bugs, etc.), follow these steps:

### 1. Update App Version

When making significant changes, update the version in `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",  // Increment this number
    ...
  }
}
```

### 2. Update Dependencies

If you need to add new packages:

```bash
cd mobile
npm install package-name --save
```

**IMPORTANT**: Make sure any new packages are compatible with Expo SDK 48.0.0.

### 3. Test Locally

Before building a new APK, test your changes locally:

```bash
npm start
```

Scan the QR code with the Expo Go app to see your changes in development mode.

### 4. Build a New APK

When you're ready to create a new APK:

```bash
eas build -p android --profile preview
```

### 5. Submit to App Stores (Optional)

For Google Play submission:

```bash
eas build -p android --profile production
```

This creates an AAB file instead of an APK, which is required for Google Play.

## Versioning Guidelines

- **Patch updates** (1.0.0 → 1.0.1): Bug fixes that don't add new features
- **Minor updates** (1.0.0 → 1.1.0): New features that don't break existing functionality
- **Major updates** (1.0.0 → 2.0.0): Major changes that might break compatibility

## Keeping Dependencies Updated

To check for outdated dependencies:

```bash
npm outdated
```

To update dependencies (use with caution and test thoroughly):

```bash
npm update
```

## Notes on Expo SDK Updates

The app is currently configured for Expo SDK 48.0.0. If you want to update to a newer SDK:

1. Check the Expo upgrade guide: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
2. Update the SDK version in app.json
3. Update dependencies according to the upgrade guide
4. Test thoroughly before building

**CAUTION**: Upgrading the SDK is a major change that could break functionality. Only do this when necessary and plan for thorough testing.