# Updated Build Instructions for Schedulizer Mobile

## Fixed Issues

We've resolved the "Invalid UUID appId" error by:

1. Removing the projectId field from app.json
2. Downgrading to a more stable Expo SDK version (48.0.0)
3. Ensuring all configuration files are properly synchronized with each other
4. Adding proper versioning and package name configurations

## How to Build the APK Now

Follow these steps to build the Android APK:

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Initialize EAS

```bash
npx eas-cli init
```

This will create a new project ID for you in the Expo system.

### 3. Build the APK

```bash
npx eas-cli build -p android --profile preview
```

Or use the npm script we've added:

```bash
npm run build:android
```

## Troubleshooting

### "Invalid UUID appId" Error

This error often occurs when:
1. The project ID hasn't been properly initialized
2. You're trying to use a projectId that doesn't exist or that you don't have access to
3. There's a mismatch between your Expo account and the project configuration

The solution is to let EAS generate a new project ID for you by running `eas init` again.

### SDK Version Mismatch

We've updated the app to use Expo SDK 48, which is more stable than newer versions. All package versions have been updated to match this SDK version.

### Assets Missing

Make sure your assets folder contains:
- icon.png (1024x1024)
- splash.png (2048x2048)
- adaptive-icon.png (1024x1024)
- favicon.png (48x48)

A simple way to generate these files is by using:

```bash
npx expo-cli generate-icons --input ./path/to/your/source-image.png
```

## Next Steps

After successfully building the APK, you'll get a URL to download it. This APK can be directly installed on Android devices.

For iOS deployment, you'll need:
1. An Apple Developer account
2. Proper app signing configuration
3. To follow the iOS-specific build steps in the docs