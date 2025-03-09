# Teacher Schedule Manager Mobile App

A native mobile application for managing teacher schedules, absences, and substitute assignments, with full offline capabilities.

## Features

- Complete offline data management with SQLite
- User authentication and authorization
- Teacher information management
- Schedule viewing and management
- Absence tracking and recording
- Intelligent substitute assignment
- CSV data import/export
- Seamless online/offline switching with sync

## Tech Stack

- React Native with Expo
- TypeScript for type safety
- SQLite for local database
- React Navigation for screen management
- React Native Paper for UI components
- Context API for state management
- Expo Document Picker for file selection
- AsyncStorage for local storage
- NetInfo for network status detection

## APK Build Instructions

### Prerequisites

1. Install Expo CLI:
   ```bash
   npm install -g expo-cli
   ```

2. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

3. Create an Expo account at https://expo.dev/signup if you don't have one

### Building the APK

1. Log in to your Expo account:
   ```bash
   eas login
   ```

2. Navigate to the mobile app directory:
   ```bash
   cd mobile
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Configure the build:
   ```bash
   eas build:configure
   ```

5. Build the APK:
   ```bash
   eas build -p android --profile preview
   ```

6. Follow the on-screen instructions. When the build is complete, you'll receive a link to download the APK file.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Use Expo Go app on your mobile device to scan the QR code, or press 'a' to open in an Android emulator.

## Project Structure

- `/assets` - App icons and assets
- `/src` - Source code
  - `/context` - Context providers for state management
  - `/screens` - UI screens
  - `/navigation` - Navigation configuration
  - `/components` - Reusable UI components
  - `/utils` - Utility functions
  - `/hooks` - Custom React hooks

## Offline First Architecture

This app follows an offline-first design approach:

1. All data is stored locally in SQLite database
2. Network status is continuously monitored
3. Data synchronization happens in the background when online
4. All operations are available regardless of connection status

This ensures the app is fully functional even without internet access, making it suitable for environments with limited connectivity.