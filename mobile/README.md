# Schedulizer Mobile App

A comprehensive teacher management and substitution scheduling mobile application that works completely offline.

## Features

- **Fully Offline Capable**: Works without internet connection
- **Teacher Management**: View and manage teacher details and schedules
- **Absence Tracking**: Mark teacher absences and manage attendance
- **Substitute Assignment**: Automatically assign substitute teachers
- **Data Import/Export**: Import/export CSV data for timetables and teacher information

## Tech Stack

- React Native with Expo
- TypeScript for type safety
- SQLite for local database
- React Navigation
- React Native Paper for UI components
- AsyncStorage for local settings

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android development) or Xcode (for iOS development)

### Installation

1. Clone the repository
2. Navigate to the project directory:
   ```
   cd mobile
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the Expo development server:
   ```
   npm start
   ```
5. Run on device/emulator:
   - Press `a` for Android
   - Press `i` for iOS (macOS only)
   - Scan the QR code with Expo Go app on your device

## Building APK

To build an APK for Android:

1. Install EAS CLI:
   ```
   npm install -g eas-cli
   ```

2. Login to your Expo account:
   ```
   eas login
   ```

3. Configure the build:
   ```
   eas build:configure
   ```

4. Build the Android APK:
   ```
   eas build -p android --profile preview
   ```

5. Once the build is complete, EAS will provide a URL to download the APK.

## Project Structure

- `App.tsx` - Main application entry point
- `app.json` - Expo configuration
- `eas.json` - EAS Build configuration
- `src/` - Contains all application code
  - `context/` - Context providers for app state
  - `screens/` - App screens
  - `navigation/` - Navigation setup
  - `theme.ts` - App theme settings

## Offline Capabilities

The app uses SQLite for a fully offline database experience:

- All data is stored locally in SQLite database
- Changes are tracked and can be synced when online
- Import/export functionality allows data transfer to/from desktop systems

## License

This project is proprietary and confidential.