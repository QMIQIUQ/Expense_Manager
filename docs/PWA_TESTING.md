# PWA Testing Guide

## Quick Testing Checklist

This guide helps you verify that PWA features are working correctly.

## Prerequisites

- Modern browser with PWA support (Chrome, Edge, Opera recommended)
- Development environment set up
- App running on localhost or deployed to a hosting service

## Testing Steps

### 1. Build the Application

```bash
cd web
npm run build
```

**Expected Results:**
- Build completes successfully
- `dist/sw.js` is generated
- `dist/manifest.webmanifest` is created
- PWA icons are copied to dist folder

### 2. Preview Production Build

```bash
npm run preview
```

Visit http://localhost:4173

### 3. Verify Manifest

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to Application tab → Manifest
3. Verify:
   - ✅ Name: "Expense Manager"
   - ✅ Start URL: "/"
   - ✅ Display: "standalone"
   - ✅ Theme color: "#10b981"
   - ✅ Icons: Multiple sizes visible (64x64, 192x192, 512x512)

### 4. Verify Service Worker Registration

**Chrome DevTools:**
1. Application tab → Service Workers
2. Verify:
   - ✅ Service worker status: "activated and is running"
   - ✅ Source: sw.js
   - ✅ No errors in console

**Console Check:**
```javascript
// Run in browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Worker registrations:', registrations);
});
```

### 5. Test Installation

**Desktop Chrome:**
1. Look for install icon (⊕) in address bar
2. Click it or use Chrome menu → "Install Expense Manager"
3. Verify:
   - ✅ Installation prompt appears
   - ✅ App installs successfully
   - ✅ App opens in standalone window
   - ✅ App icon appears in applications menu

**Mobile Chrome:**
1. Tap "Add Expense Manager to Home screen" banner
2. Or: Menu (⋮) → "Add to Home screen"
3. Verify:
   - ✅ Icon appears on home screen
   - ✅ App opens in standalone mode
   - ✅ No browser UI visible

### 6. Test Custom Install Prompt

1. Visit the app in a browser that supports PWA
2. Interact with the page (click, scroll)
3. Verify:
   - ✅ Custom install prompt appears at bottom of screen
   - ✅ Shows app icon, name, and description
   - ✅ "Install" button works
   - ✅ "Not now" button dismisses prompt
   - ✅ Dismissed state is remembered (localStorage)

### 7. Test Offline Functionality

**Method 1: Using DevTools**
1. Open DevTools → Network tab
2. Check "Offline" checkbox
3. Reload the page
4. Verify:
   - ✅ App loads successfully
   - ✅ UI is fully functional
   - ✅ Static content visible
   - ✅ "Working offline" message may appear

**Method 2: Airplane Mode**
1. Enable airplane mode on device
2. Open the installed PWA
3. Verify:
   - ✅ App launches successfully
   - ✅ Cached content is accessible
   - ✅ No critical errors

### 8. Test Cache Storage

**Chrome DevTools:**
1. Application tab → Cache Storage
2. Verify caches exist:
   - ✅ `workbox-precache-v2-*` (static assets)
   - ✅ `google-fonts-cache` (if fonts loaded)
   - ✅ `firebase-api-cache` (if API called)
   - ✅ `firebase-auth-cache` (if authenticated)
3. Expand precache and verify:
   - ✅ HTML, CSS, JS files are cached
   - ✅ PWA icons are cached
   - ✅ Manifest is cached

### 9. Test Caching Strategies

**Network-First (Firebase API):**
1. Load app while online
2. Make some expense operations
3. Go offline
4. Verify:
   - ✅ Previous data still visible from cache
   - ✅ New operations show appropriate offline message

**Cache-First (Google Fonts):**
1. Load app once while online
2. Go offline
3. Reload app
4. Verify:
   - ✅ Fonts load instantly from cache
   - ✅ No network requests for fonts

### 10. Test Update Mechanism

1. Make a small change to the code
2. Run `npm run build`
3. Deploy the updated version
4. Visit the old version in browser
5. Verify:
   - ✅ New service worker installs in background
   - ✅ Update prompt appears: "New content available. Reload to update?"
   - ✅ Clicking OK reloads with new version
   - ✅ No data loss after update

### 11. Test Lighthouse PWA Audit

1. Open Chrome DevTools → Lighthouse tab
2. Select "Progressive Web App" category
3. Click "Generate report"
4. Verify scores:
   - ✅ PWA score > 90
   - ✅ Fast and reliable loading
   - ✅ Installable
   - ✅ PWA optimized

**Key Checks:**
- ✅ Registers a service worker
- ✅ Responds with 200 when offline
- ✅ Has a `<meta name="viewport">` tag
- ✅ Contains theme-color meta tag
- ✅ Has a valid web app manifest
- ✅ Uses HTTPS (in production)

## Common Issues and Solutions

### Issue: Install button not showing
**Solution:**
- Ensure app is served over HTTPS (localhost is OK)
- Verify manifest is valid in DevTools
- Check service worker is registered
- Try interacting with page first (some browsers require user engagement)

### Issue: Service worker not updating
**Solution:**
- Hard reload: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- DevTools → Application → Service Workers → "Update"
- Clear site data: DevTools → Application → Clear storage
- Check for errors in console

### Issue: Offline mode not working
**Solution:**
- Verify service worker is activated
- Check Cache Storage has content
- Ensure `registerType: 'autoUpdate'` is set
- Check network requests in offline mode

### Issue: Icons not displaying
**Solution:**
- Verify icon files exist in `public/` folder
- Check icon paths in manifest are correct (relative, no leading slash)
- Ensure icons are proper sizes (192x192, 512x512)
- Clear cache and reload

## Browser Compatibility Testing

Test on multiple browsers:

**Desktop:**
- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Opera 76+
- ⚠️ Firefox (limited PWA, no install)
- ⚠️ Safari (basic support)

**Mobile:**
- ✅ Chrome Android
- ✅ Samsung Internet
- ⚠️ Safari iOS (manual install only)

## Automated Testing

### Check PWA features programmatically

```javascript
// Check if PWA is installable
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA is installable');
});

// Check if running as installed PWA
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('Running as installed PWA');
}

// Check service worker support
if ('serviceWorker' in navigator) {
  console.log('Service Worker API supported');
}
```

## Success Criteria

All of the following should be true:

- ✅ App builds without errors
- ✅ Service worker registers successfully
- ✅ Manifest is valid and accessible
- ✅ Icons display correctly in all sizes
- ✅ App is installable on desktop and mobile
- ✅ Install prompt appears and works
- ✅ App works offline (loads and shows cached content)
- ✅ Cache strategies work as expected
- ✅ Update mechanism functions properly
- ✅ Lighthouse PWA score > 90
- ✅ No console errors related to PWA

## Performance Metrics

Monitor these metrics:

- **First Contentful Paint (FCP)**: < 1.8s
- **Time to Interactive (TTI)**: < 3.8s
- **Speed Index**: < 3.4s
- **Total Blocking Time (TBT)**: < 300ms
- **Cumulative Layout Shift (CLS)**: < 0.1

## Related Documentation

- [PWA_GUIDE.md](./PWA_GUIDE.md) - Complete PWA feature documentation
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - General testing guide
- [OFFLINE_TESTING_GUIDE.md](../web/OFFLINE_TESTING_GUIDE.md) - Offline sync testing

## Resources

- [Lighthouse PWA Audits](https://web.dev/lighthouse-pwa/)
- [PWA Testing Best Practices](https://web.dev/pwa-checklist/)
- [Service Worker Testing](https://developers.google.com/web/fundamentals/primers/service-workers)
