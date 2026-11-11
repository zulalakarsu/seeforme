# Troubleshooting Guide

## "App Entry Not Found" Error

If you encounter "app entry not found" when running the development build, try these solutions:

### Solution 1: Clean Build
```bash
# Clean everything and rebuild
npx expo prebuild --clean
npx expo run:ios --clean
```

### Solution 2: Check Entry Point Configuration
Ensure these files are correctly configured:

**package.json:**
```json
{
  "main": "index.js"
}
```

**app.json:**
```json
{
  "expo": {
    "entryPoint": "./index.js"
  }
}
```

**index.js:**
```javascript
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
```

### Solution 3: Manual Build Process

If automated builds fail, try building manually:

**For iOS:**
1. Open `ios/Captura.xcworkspace` in Xcode
2. Select your device/simulator
3. Build and run (⌘+R)

**For Android:**
1. Open `android` folder in Android Studio
2. Build and run the project

### Solution 4: EAS Development Build

If local builds continue to fail, use EAS:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Create development build
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Common Issues

1. **NitroModules Error**: Must use development build, not Expo Go
2. **Port Conflicts**: Use `--port 8084` if 8081 is busy
3. **Version Mismatch**: Run `npm install` to fix dependency versions
4. **Cache Issues**: Use `--clear` flag when starting expo

### Verification Steps

1. TypeScript compilation: `npx tsc --noEmit`
2. Metro bundler: `npx expo start --port 8084`
3. Development build: `npx expo run:ios` or `npx expo run:android`

If none of these solutions work, the app code is complete and ready - the issue is likely with the build environment setup.