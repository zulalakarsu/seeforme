# Captura Testing Guide

## Test Image Available
- **Source**: `/Users/zulalakarsu/Downloads/IMG_7357D4CF32E4-1.jpeg`
- **Copied to**: `assets/test-photo.jpeg`
- **Ready for**: Development build testing

## Quick Start Testing

### 1. Build and Run
```bash
# Clean build for iOS
npx expo run:ios --clean

# Clean build for Android
npx expo run:android --clean
```

### 2. Expected Flow
1. **Welcome Screen**
   - See privacy messaging
   - Tap "Start Analysis"
   - Model download starts (~420MB)

2. **Model Download**
   - Progress bar shows download status
   - Should complete in 1-3 minutes
   - Auto-proceeds to scanning

3. **Scanning Screen**
   - Analyzes 5 most recent photos
   - Shows progress: "1/5", "2/5", etc.
   - Real-time photo names
   - Should complete in ~15 seconds

4. **Results Dashboard**
   - Card-based insights display
   - Indoor/outdoor percentages
   - Object detection results
   - People detection stats
   - Quality assessment

## Expected Analysis for Test Photo

Your image `IMG_7357D4CF32E4-1.jpeg` should produce something like:

```json
{
  "scene": "indoor" or "outdoor",
  "objects": ["person", "furniture", "device"], 
  "hasPeople": true,
  "quality": "good",
  "setting": "home"
}
```

## Validation Checklist

### ✅ Core Functionality
- [ ] App builds without errors
- [ ] Model downloads successfully 
- [ ] Photo permissions granted
- [ ] 5 photos analyzed quickly
- [ ] JSON responses are valid
- [ ] Dashboard shows insights

### ✅ Performance
- [ ] Model download: 1-3 minutes
- [ ] 5 photos processed: ~15 seconds  
- [ ] No crashes during analysis
- [ ] Smooth UI transitions

### ✅ Privacy Features
- [ ] "Your photos never leave your phone" messaging
- [ ] "On-device AI" clearly stated
- [ ] No network requests during analysis
- [ ] Works in airplane mode (after download)

### ✅ Error Handling
- [ ] Permission denial handled gracefully
- [ ] Network failures don't crash app
- [ ] Invalid photos are skipped
- [ ] Clear error messages

## Troubleshooting

### Model Download Issues
- Check internet connection
- Ensure 1GB+ free storage
- Try restarting the app

### Photo Analysis Failures  
- Verify camera roll has photos
- Check photo formats (JPG/PNG)
- Ensure model is fully downloaded

### Performance Issues
- Close other apps to free memory
- Use fewer photos for testing
- Check device meets requirements

## Next Steps After Testing

1. **If successful**: Scale up to 30 photos
2. **If issues**: Check logs and error messages  
3. **For demo**: Pre-download model beforehand
4. **For production**: Add more robust error handling

## Device Requirements Verified
- ✅ iOS 13+ or Android 8+
- ✅ 2GB+ RAM  
- ✅ 1GB+ free storage
- ✅ Modern chipset support

Ready to test! 🚀