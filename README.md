# 📷 Captura - Privacy-First Photo Analysis

A React Native app that analyzes your camera roll using on-device AI to provide insights while keeping all your data private.

## Features

- **🔒 Privacy-First**: All processing happens on your device
- **🤖 On-Device AI**: Powered by Cactus vision models
- **📊 Smart Insights**: Scene analysis, object detection, and photo categorization
- **📱 Cross-Platform**: Works on iOS and Android

## Tech Stack

- **React Native** with Expo + TypeScript
- **Cactus React Native SDK** with `useCactusLM` hook for on-device AI
- **LiquidAI/LFM2-VL-450M** vision model (420MB)
- **React Navigation** for screen navigation
- **AsyncStorage** for local data storage

## ⚠️ Important: Development Build Required

**This app uses Cactus React Native SDK with NitroModules, which are not supported in Expo Go.** You must use a development build to test the app.

## Installation

1. **Clone and navigate to the project:**
   ```bash
   cd captura-app
   npm install
   ```

2. **Install Expo CLI (if not already installed):**
   ```bash
   npm install -g @expo/cli
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Build and run (Development Build Required):**
   
   Since Cactus uses NitroModules, you need a development build:
   
   **Option A: Local Development Build**
   ```bash
   # iOS (requires Xcode)
   npx expo run:ios
   
   # Android (requires Android Studio)
   npx expo run:android
   ```
   
   **Option B: EAS Development Build**
   ```bash
   # Login to Expo (first time only)
   eas login
   
   # Build for iOS
   eas build --profile development --platform ios
   
   # Build for Android  
   eas build --profile development --platform android
   ```

## First Run Setup

1. **Permissions**: Grant camera roll access when prompted
2. **Model Download**: ~420MB AI model (LiquidAI/LFM2-VL-450M) will download automatically
3. **Analysis**: Analyzes 5 most recent photos for quick testing (~15 seconds)
4. **Results**: View your privacy-safe insights dashboard

## App Flow

1. **Welcome Screen** - Privacy messaging and model download with `useCactusLM` hook
2. **Scanning Screen** - Real-time processing using vision analysis  
3. **Results Dashboard** - Card-based insights display

## Key Features

✅ **React Hook State Management** - `useCactusLM` for automatic state handling  
✅ **Official API Patterns** - Following Cactus React Native documentation  
✅ **Vision Analysis** - LiquidAI/LFM2-VL-450M for image understanding  
✅ **Batch Processing** - 5 photos for quick testing, scalable to 30+  
✅ **Error Handling** - Comprehensive error states and recovery

## Privacy & Security

✅ **All processing on-device**  
✅ **No cloud uploads**  
✅ **No data sharing**  
✅ **Local storage only**  
✅ **No internet required after setup**

## Development

- **TypeScript**: Full type safety with custom interfaces
- **Services**: Modular architecture (Cactus, Photos, Storage, Processor)
- **Components**: Reusable UI components (ProgressBar, StatCard)
- **Error Handling**: Comprehensive error management
- **Testing**: Ready for device testing

## Requirements

- **iOS 13+** or **Android 8+**
- **2GB+ RAM**
- **1GB+ free storage** (for AI model)
- **Modern chipset** (A12+ or Snapdragon 845+)

## Performance & Testing

**Initial Testing Configuration:**
- **Batch size**: 5 photos for quick validation
- **Model**: LiquidAI/LFM2-VL-450M (420MB)
- **Processing time**: ~15 seconds total
- **Per photo**: 2-3 seconds analysis

**Production Ready:**
- Can easily scale to 30+ photos
- Full batch would take ~2-3 minutes
- Model downloads once, works offline forever

## Demo Goals

- ✅ Scan 5 photos in under 15 seconds (testing batch)
- ✅ Fast processing with LiquidAI/LFM2-VL-450M model
- ✅ Clear privacy messaging throughout  
- ✅ Compelling insights dashboard
- ✅ Zero crashes during demo
- ✅ Full offline functionality

## Project Structure

```
src/
├── screens/          # React Native screens
├── services/         # Business logic services
├── components/       # Reusable UI components
└── types/           # TypeScript type definitions
```

Built with ❤️ using Cactus on-device AI