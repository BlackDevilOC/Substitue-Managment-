# Building the Schedulizer APK

This guide will walk you through the process of building the Android APK for the Schedulizer app using Expo EAS Build.

## Prerequisites

1. You need an Expo account (create one at [expo.dev](https://expo.dev/signup))
2. Expo CLI installed globally:
   ```
   npm install -g expo-cli
   ```
3. EAS CLI installed globally:
   ```
   npm install -g eas-cli
   ```
4. Node.js and npm
5. Git (to clone the repository)

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

## Step 3: Configure the build

Ensure your `eas.json` file is properly configured. The one in this repository is already set up for both development and production builds.

## Step 4: Start the build process

For a development/preview build:

```bash
eas build -p android --profile preview
```

For a production build:

```bash
eas build -p android --profile production
```

## Step 5: Wait for the build to complete

The build process will run on Expo's servers. You can track the progress in the terminal or visit the build URL provided by EAS.

## Step 6: Download the APK

When the build is complete, you'll receive a URL to download the APK file. You can:

1. Download it directly from the provided URL
2. Use the following command to get the latest build URL:
   ```bash
   eas build:list
   ```

## Step 7: Install on your device

Transfer the APK to your Android device and install it. You might need to allow installation from unknown sources in your device settings.

## Troubleshooting

- If you encounter credential issues: `eas credentials`
- If you need to update the app version: Update `app.json` version field
- For build-specific problems: Check the build logs on the Expo dashboard

## Additional Commands

- View build history: `eas build:list`
- Cancel an in-progress build: `eas build:cancel`
- Clear build cache: `eas build --clear-cache`

## Notes

- The first build might take longer as Expo sets up the environment
- Android builds typically take 10-15 minutes to complete
- You need a valid app icon and splash screen in the `assets` folder as specified in `app.json`