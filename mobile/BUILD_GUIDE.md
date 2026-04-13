# 🚀 Production Build Guide - Entry Club

## Prerequisites
- Node.js 18+ installed
- EAS CLI installed globally: `npm install -g eas-cli`
- Expo account (free tier works)

## Quick Build Commands

### 1. Preview Build (Fast APK for Testing)
```bash
cd mobile
npm run build:preview
```
This creates an optimized APK for internal testing.

### 2. Production Build (Optimized APK)
```bash
cd mobile
npm run build:production
```
This creates a fully optimized production APK.

### 3. Production AAB (For Play Store)
```bash
cd mobile
npm run build:aab
```
This creates an Android App Bundle for Google Play Store submission.

## Build Optimizations Included

### ⚡ Performance
- **Hermes Engine**: Enabled for faster startup and lower memory usage
- **ProGuard**: Code minification and obfuscation enabled
- **Resource Shrinking**: Removes unused resources automatically
- **Metro Minification**: Removes console.logs and debug code
- **React Query**: Optimized cache settings (5min stale time)

### 📦 Size Reduction
- Console logs stripped in production
- Dead code elimination
- Asset optimization
- Unused resources removed

### 🔒 Security
- Code obfuscation via ProGuard
- No cleartext traffic allowed
- Secure socket connections only

## Build Process

1. **Login to EAS** (first time only):
   ```bash
   eas login
   ```

2. **Configure Project** (first time only):
   ```bash
   eas build:configure
   ```

3. **Start Build**:
   ```bash
   npm run build:production
   ```

4. **Monitor Build**:
   - Build runs on EAS cloud servers
   - Check progress at: https://expo.dev/accounts/[your-account]/projects/entry-club/builds
   - Typical build time: 10-15 minutes

5. **Download APK**:
   - Once complete, download link appears in terminal
   - Or download from EAS dashboard

## Local Development

### Start Development Server
```bash
npm start
```

### Run on Android Device
```bash
npm run android
```

## Environment Variables

Create `.env` file in mobile directory:
```env
API_BASE_URL=https://your-api-url.com/api/v1
```

## Troubleshooting

### Build Fails
- Clear cache: `npx expo start -c`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check EAS build logs for specific errors

### APK Too Large
- Check asset sizes in `src/assets/`
- Optimize images before adding
- Use WebP format for images

### Slow Performance
- Ensure Hermes is enabled (check app.json)
- Check for memory leaks in components
- Use React DevTools Profiler

## Performance Benchmarks

Expected metrics after optimizations:
- **APK Size**: ~40-60 MB (optimized)
- **Cold Start**: < 2 seconds
- **Memory Usage**: ~150-200 MB
- **JS Bundle**: ~5-8 MB (minified)

## Production Checklist

Before releasing:
- [ ] Test on multiple Android versions (8.0+)
- [ ] Test on different screen sizes
- [ ] Verify all API endpoints are production URLs
- [ ] Test offline functionality
- [ ] Check app permissions
- [ ] Test push notifications
- [ ] Verify payment flows
- [ ] Test deep linking
- [ ] Check socket connections
- [ ] Review crash analytics

## Support

For build issues:
- Check EAS docs: https://docs.expo.dev/build/introduction/
- Expo Discord: https://chat.expo.dev/
- GitHub Issues: Create issue with build logs
