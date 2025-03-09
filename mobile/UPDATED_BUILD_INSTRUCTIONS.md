# Complete Build Instructions for Schedulizer Mobile App

This guide provides detailed instructions for building the Schedulizer mobile app APK from scratch on any machine.

## Prerequisites

You'll need:
- Node.js (v16 or later)
- A computer with at least 8GB RAM (Windows, Mac, or Linux)
- An Expo account (free to create at https://expo.dev/signup)
- Internet connection

## Step 1: Set Up Development Environment

1. Install Node.js from https://nodejs.org/ (LTS version recommended)

2. Install Expo CLI and EAS CLI globally:
   ```bash
   npm install -g expo-cli eas-cli
   ```

3. Log in to your Expo account (create one if you don't have it):
   ```bash
   eas login
   ```

## Step 2: Prepare the Project

1. Download the project code from Replit (download as ZIP or clone the repository)

2. Open a terminal and navigate to the project folder

3. Navigate to the mobile app directory:
   ```bash
   cd mobile
   ```

4. Install dependencies:
   ```bash
   npm install
   ```
   
## Step 3: Verify Configuration

The following files have already been updated to fix build issues:

1. `app.json`: 
   - Slug changed to match Expo project: "rest-express"
   - SDK version set to 48.0.0
   - Problematic plugins (expo-sqlite) removed
   - Android permissions properly configured

2. `package.json`:
   - Dependencies aligned with Expo SDK 48.0.0
   - Conflicting dependencies removed

3. `eas.json`:
   - Build profiles properly configured
   - Channel and environment settings added

## Step 4: Build the APK

1. Run the build command:
   ```bash
   eas build -p android --profile preview
   ```

2. Follow the prompts - if this is your first build, EAS will:
   - Ask to create a new build profile (accept the default)
   - Ask whether to generate a new keystore or use an existing one (let EAS generate one for you)

3. The build process will start on Expo's servers. You'll see a URL where you can monitor the build progress.

4. When the build is complete (typically 10-15 minutes), you'll receive a download link for the APK.

## Step 5: Install and Test

1. Download the APK to your Android device

2. Enable "Install from Unknown Sources" in your device settings if you haven't already

3. Install the APK and test all functionalities:
   - Teacher management
   - Schedule viewing
   - Attendance tracking
   - Offline capabilities

## Troubleshooting Common Issues

1. **Authentication problems**:
   - Run `eas logout` and then `eas login` again
   - Verify you're logging into the correct Expo account

2. **"Project not found" error**:
   - Ensure you're using the account that owns the "rest-express" project
   - If needed, transfer the project ownership in the Expo dashboard

3. **Build failures**:
   - Check the build logs on the Expo dashboard
   - Common issues include dependency mismatches and permissions problems

4. **APK installation issues**:
   - Make sure your Android device allows installation from unknown sources
   - Check if the APK is compatible with your device's Android version

## Notes About the Fixed Configuration

1. **Expo SDK version**: We're using SDK 48.0.0 which is stable and well-tested

2. **App slug**: Changed from "schedulizer-mobile" to "rest-express" to match the Expo project 

3. **Plugin removal**: Removed problematic expo-sqlite plugin and replaced with expo-file-system

4. **Android permissions**: Added appropriate permissions for file access and internet connectivity

## For Future Reference

When developing, you can test locally using:
```bash
npm start
```

This will give you a QR code to scan with the Expo Go app on your device for development testing.

Remember that the APK build needs to be done on a machine with sufficient resources, as the build process can be resource-intensive.