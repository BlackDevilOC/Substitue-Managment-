# Building the Schedulizer Mobile App

## How to Fix the Current Build Issues

The error you're experiencing is related to the Expo configuration. Here's how to resolve it:

### Step 1: Install Required Dependencies

From the `mobile` directory, run:

```bash
npm install
```

This will install all the dependencies specified in the updated package.json file.

### Step 2: Fix the Expo Package Version

The error message shows you're trying to use `expo@52.0.37`, but that version doesn't exist. Our package.json file now specifies `expo@~49.0.15`, which is a stable version.

### Step 3: Correct Project Structure

Make sure your project structure follows the Expo standards:
- App entry point is in `App.tsx`
- Assets are in the `assets` folder
- Configuration is in `app.json`
- EAS Build configuration is in `eas.json`

### Step 4: Generate Default Assets

If you don't have custom app icons yet, you can generate them with:

```bash
npx expo-cli generate-icons
```

### Step 5: Initialize EAS Build

```bash
npx eas-cli build:configure
```

This will verify your setup and initialize EAS Build.

### Step 6: Try Building Again

For a development build (APK):

```bash
npx eas-cli build -p android --profile preview
```

## Common Issues and Solutions

1. **"Module 'expo' is not installed"**
   - Solution: Ensure you've run `npm install` and that the `expo` package is listed in your package.json

2. **"Cannot determine SDK version"**
   - Solution: Make sure your app.json file has the correct SDK version that matches your expo package version

3. **Dependencies Conflicts**
   - Solution: If you see warnings about deprecated packages, you can usually ignore them for now, but for serious conflicts try `npm install --force`

4. **Build Fails on EAS**
   - Solution: Check the build logs for specific errors. Common issues include:
     - Missing assets
     - Incorrectly configured app.json
     - Unsupported native modules

## Using the Local Expo Dev Environment

If you want to test locally before building an APK:

```bash
npx expo start
```

Then use the Expo Go app on your phone to scan the QR code and test the app.

## Updating the Code

If you make changes to the code:
1. Test locally with `npx expo start`
2. Commit your changes
3. Run the build process again with `npx eas-cli build`