# PWA (Progressive Web App) Guide

## Overview

The Expense Manager web application is now a Progressive Web App (PWA), which means it can be installed on your device and work offline, providing a native app-like experience.

## What is a PWA?

A Progressive Web App (PWA) is a web application that uses modern web capabilities to deliver an app-like experience to users. PWAs can be installed on your device, work offline, receive push notifications, and access device features.

## Features

### 🚀 Installable

The app can be installed on your device (desktop or mobile) for quick access without opening a browser:

- **Desktop**: Look for the install icon in your browser's address bar
- **Mobile**: Use the "Add to Home Screen" option in your browser menu
- **Custom Prompt**: The app shows a friendly installation prompt when available

### 📴 Offline Support

The app works even without an internet connection:

- **Service Worker**: Caches essential assets and pages for offline access
- **Smart Caching**: Uses different strategies for different types of content
  - **Static Assets**: Cached on first visit (CSS, JS, images)
  - **Firebase API**: Network-first with fallback to cache
  - **Google Fonts**: Cache-first for better performance

### 🎨 Native-Like Experience

When installed, the app provides a native app experience:

- **Standalone Display**: Opens in its own window without browser UI
- **Theme Colors**: Matches your device's system theme
- **App Icon**: Beautiful icon on your home screen/desktop
- **Splash Screen**: Loading screen when launching the app

## Installation Instructions

### On Desktop (Chrome, Edge, Opera)

1. Visit the Expense Manager web app
2. Look for the install icon (⊕ or 🔽) in the address bar
3. Click it and confirm the installation
4. The app will be added to your applications menu

**Alternative:**
- Click the three-dot menu (⋮) in your browser
- Select "Install Expense Manager" or "Install app"
- Confirm the installation

### On Mobile (Android - Chrome, Samsung Internet)

1. Open the Expense Manager in your mobile browser
2. Tap the "Add Expense Manager to Home screen" prompt
3. Or tap the browser menu (⋮) → "Add to Home screen"
4. Choose a name and confirm
5. The app icon will appear on your home screen

### On Mobile (iOS - Safari)

1. Open the Expense Manager in Safari
2. Tap the Share button (□↑)
3. Scroll down and tap "Add to Home Screen"
4. Choose a name and tap "Add"
5. The app icon will appear on your home screen

## PWA Technical Details

### Manifest Configuration

The app manifest (`manifest.json`) defines the app's metadata:

```json
{
  "name": "Expense Manager",
  "short_name": "Expense Manager",
  "description": "A comprehensive expense tracking application",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#10b981",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/pwa-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/pwa-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/maskable-icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### Service Worker Caching Strategies

The app uses Workbox for intelligent caching:

1. **Precaching**: Essential app files are cached during installation
2. **Runtime Caching**:
   - **Google Fonts**: `CacheFirst` - Always use cached version for speed
   - **Firebase Firestore**: `NetworkFirst` - Try network, fallback to cache (10s timeout)
   - **Firebase Auth**: `NetworkFirst` - Ensure fresh auth tokens when online

### Update Mechanism

The service worker automatically updates when a new version is deployed:

1. New version detected in the background
2. User receives a prompt: "New content available. Reload to update?"
3. Clicking "OK" reloads the app with the latest version
4. Offline-ready notification appears when the app is ready for offline use

## Development

### Building with PWA Support

The PWA plugin is integrated with Vite:

```bash
npm run build
```

This generates:
- `dist/sw.js` - Service worker file
- `dist/manifest.webmanifest` - App manifest
- `dist/workbox-*.js` - Workbox runtime
- PWA icons in various sizes

### Testing PWA Features

#### Local Development

The PWA plugin is enabled in development mode:

```bash
npm run dev
```

Visit http://localhost:3000 and check:
- Browser console for service worker registration
- DevTools → Application → Service Workers
- DevTools → Application → Manifest

#### Production Build

Test the production build locally:

```bash
npm run build
npm run preview
```

Then test:
1. Install the app using browser's install button
2. Go offline (DevTools → Network → Offline)
3. Verify the app still loads and functions
4. Check cached resources in DevTools → Application → Cache Storage

### PWA Checklist

✅ Web App Manifest
✅ Service Worker
✅ HTTPS (required for PWA - automatic on most hosts)
✅ Responsive Design
✅ Offline Functionality
✅ Fast Load Time
✅ Proper Icons (multiple sizes)
✅ Theme Colors
✅ Install Prompt

## Troubleshooting

### Installation Button Not Showing

- Ensure the app is served over HTTPS (localhost is exempt)
- Check that the manifest is valid (DevTools → Application → Manifest)
- Verify service worker is registered (DevTools → Application → Service Workers)
- Some browsers require the user to interact with the page first

### App Not Working Offline

- Check service worker status in DevTools
- Verify files are being cached (Application → Cache Storage)
- Force reload (Ctrl+Shift+R) to refresh the service worker
- Check the Network tab to see which requests are failing

### Service Worker Not Updating

- Hard reload the page (Ctrl+Shift+R)
- Click "Update" in DevTools → Application → Service Workers
- Clear site data and reinstall
- Ensure `registerType: 'autoUpdate'` is set in vite.config.ts

### Icons Not Displaying

- Check that icon files exist in the `public` folder
- Verify icon paths in manifest are correct
- Ensure icons are properly sized (192x192, 512x512)
- Clear browser cache and reload

## Browser Support

### Desktop
- ✅ Chrome 90+ (full support)
- ✅ Edge 90+ (full support)
- ✅ Opera 76+ (full support)
- ⚠️ Firefox (limited PWA support)
- ⚠️ Safari (basic support, no installation)

### Mobile
- ✅ Chrome Android (full support)
- ✅ Samsung Internet (full support)
- ⚠️ Safari iOS (limited support, manual installation only)
- ✅ Edge Mobile (full support)

## Best Practices

1. **Always use HTTPS** - PWAs require a secure context
2. **Keep service worker updated** - Use `registerType: 'autoUpdate'`
3. **Optimize cache size** - Don't cache unnecessary files
4. **Test offline scenarios** - Ensure critical functionality works offline
5. **Handle updates gracefully** - Show clear update prompts to users
6. **Monitor performance** - PWAs should load in under 3 seconds
7. **Provide fallbacks** - Show meaningful error messages when offline

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [vite-plugin-pwa Documentation](https://vite-pwa-org.netlify.app/)

## Related Guides

- [OFFLINE_SYNC_GUIDE.md](./OFFLINE_SYNC_GUIDE.md) - Offline data synchronization
- [FEATURES.md](./FEATURES.md) - Complete feature list
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
