# Fixed Build Guide for Schedulizer Mobile App

I've fixed the configuration issues that were preventing the APK build. Follow these steps to build your APK:

## What Was Fixed

1. Updated the `app.json` file:
   - Changed the slug to match the Expo project ("rest-express")
   - Fixed the SDK version to 48.0.0 (a stable version)
   - Removed problematic plugins (expo-sqlite)
   - Properly configured Android permissions

2. Updated the `package.json` file:
   - Aligned all dependencies with Expo SDK 48.0.0
   - Removed conflicting dependencies
   - Made sure all versions are compatible

3. Updated the `eas.json` file:
   - Added proper configuration for builds
   - Added channeling and environment variables
   - Set appVersionSource to "remote"

## How to Build the APK

Follow these steps on your local machine:

### 1. Make sure you have Expo CLI and EAS CLI installed

```bash
npm install -g expo-cli eas-cli
```

### 2. Log in to your Expo account

```bash
eas login
```

### 3. Build the APK

Navigate to the mobile folder and run:

```bash
cd mobile
eas build -p android --profile preview
```

The build will be processed on Expo's servers, and you'll receive a URL to download the APK when it's complete.

## Troubleshooting

If you encounter any issues:

1. **Authentication problems**:
   - Make sure you're logged into the correct Expo account that owns the project

2. **Build failures**:
   - Check the logs in the Expo dashboard
   - Verify that your account has enough build minutes available

3. **SDK version issues**:
   - The app is now configured for Expo SDK 48.0.0, which is stable with React Native 0.71.8

## Signing the APK

By default, EAS Build will handle the signing process for you. If you need to use your own keystore:

1. Generate a keystore (if you don't have one):
   ```bash
   keytool -genkey -v -keystore schedulizer.keystore -alias schedulizer -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configure your build profile in eas.json to use your keystore:
   ```json
   "preview": {
     "android": {
       "buildType": "apk",
       "gradleCommand": ":app:assembleRelease",
       "credentialsSource": "local"
     }
   }
   ```

3. Follow the EAS documentation for setting up local credentials.

## Next Steps

After building and installing the APK:

1. Test all functionality on real devices
2. Verify that file uploads and downloads work correctly
3. Test the offline capabilities of the app

For production releases, use the "production" profile instead of "preview" to build an Android App Bundle (AAB) for Google Play submission.