
# Building the Schedulizer Mobile App APK

This guide will walk you through the process of building an Android APK for the Schedulizer mobile app.

## Prerequisites

1. An Expo account (create one at [expo.dev](https://expo.dev/signup))
2. EAS CLI installed globally:
   ```bash
   npm install -g eas-cli
   ```
3. Node.js and npm

## Step 1: Install dependencies

Make sure you have all dependencies installed:

```bash
cd mobile
npm install
```

## Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials when prompted.

## Step 3: Build the APK

For a development/preview build that you can directly install on your device:

```bash
npm run build:apk
```

or

```bash
eas build -p android --profile preview
```

## Step 4: Wait for the build to complete

The build process will run on Expo's servers. You can track the progress in the terminal or visit the build URL provided by EAS.

## Step 5: Download the APK

When the build is complete, you'll receive a URL to download the APK file. You can:

1. Download it directly from the provided URL
2. Use the following command to get the latest build URL:
   ```bash
   eas build:list
   ```

## Step 6: Install on your device

Transfer the APK to your Android device and install it. You might need to allow installation from unknown sources in your device settings.

## Build Configuration

Our app has the following build profiles configured in `eas.json`:

- **development**: For development and testing (includes development client)
- **preview**: For internal distribution as APK files
- **production**: For Play Store submission as AAB (Android App Bundle)

## Additional Commands

- View build history: `eas build:list`
- Cancel an in-progress build: `eas build:cancel`
- Build for production: `eas build -p android --profile production`

## Notes

- The app is configured for offline capability with SQLite database
- The app includes features for teacher management, absence tracking, and substitute assignment
- All data is stored locally in the device for offline operation
