# 📸 Screenshots Guide

This directory contains app screenshots for documentation and portfolio presentation.

## 📁 Directory Structure

```
screenshots/
├── auth/                    # Authentication & onboarding screens
├── landlord/               # Landlord-specific features
├── renter/                 # Renter-specific features
├── features/               # Cross-cutting features
└── README.md              # This file
```

---

## 🎯 Screenshot Requirements

### General Guidelines

- **Device**: Use iPhone 14 Pro (iOS) or Pixel 7 (Android) for consistency
- **Resolution**: 1170×2532 (iOS) or 1080×2400 (Android)
- **Format**: PNG with transparency where applicable
- **Naming**: Use descriptive kebab-case names (e.g., `landlord-dashboard.png`)
- **Status Bar**: Show realistic status bar (time: 9:41, full battery, signal)
- **Content**: Use realistic demo data (not production user data)

### Screenshot Sizes

| Type | Dimensions | Purpose |
|------|------------|---------|
| **Portrait** | 1170×2532 (iOS) | Primary app screens |
| **Landscape** | 2532×1170 (iOS) | Tablet layouts (future) |
| **Thumbnail** | 400×866 | README preview images |

---

## 📋 Required Screenshots Checklist

### Authentication & Onboarding (`auth/`)

- [ ] `01-splash-screen.png` - App splash screen with logo
- [ ] `02-sign-in.png` - Clerk hosted sign-in page
- [ ] `03-onboarding-welcome.png` - Landlord onboarding welcome
- [ ] `04-onboarding-property.png` - Property setup flow
- [ ] `05-persona-selection.png` - Landlord/Renter experience choice

### Landlord Screens (`landlord/`)

**Dashboard & Overview**
- [ ] `01-dashboard-home.png` - Main dashboard with rent summary
- [ ] `02-rent-collection.png` - Monthly rent collection view
- [ ] `03-occupancy-stats.png` - Unit occupancy overview
- [ ] `04-overdue-entries.png` - Overdue payments list

**Property Management**
- [ ] `05-properties-list.png` - All properties overview
- [ ] `06-property-detail.png` - Single property details
- [ ] `07-add-property.png` - New property form
- [ ] `08-units-list.png` - Units under a property

**Maintenance Management**
- [ ] `09-maintenance-list.png` - All repair requests (with filters)
- [ ] `10-maintenance-detail.png` - Single repair request detail
- [ ] `11-maintenance-photos.png` - Attached photos viewer
- [ ] `12-maintenance-status-update.png` - Status change modal

**Tenant Management**
- [ ] `13-leases-list.png` - Active leases overview
- [ ] `14-lease-detail.png` - Lease details with renter info
- [ ] `15-record-payment.png` - Cash payment recording form

**Settings & More**
- [ ] `16-more-screen.png` - Settings and account options
- [ ] `17-notifications-list.png` - Notification center

### Renter Screens (`renter/`)

**Dashboard & Balance**
- [ ] `01-dashboard-home.png` - Renter home with balance
- [ ] `02-balance-breakdown.png` - Detailed balance view
- [ ] `03-due-date-alert.png` - Rent due date notification

**Payment Flows**
- [ ] `04-payment-screen.png` - M-Pesa payment initiation
- [ ] `05-payment-amount-input.png` - Custom amount entry
- [ ] `06-payment-awaiting.png` - STK prompt sent (awaiting confirmation)
- [ ] `07-payment-success.png` - Payment confirmed with receipt
- [ ] `08-payment-history.png` - Past payments list

**Maintenance Requests**
- [ ] `09-report-issue.png` - New maintenance request form
- [ ] `10-issue-photo-picker.png` - Photo attachment flow
- [ ] `11-maintenance-list.png` - Renter's active requests
- [ ] `12-maintenance-detail.png` - Request status & updates

**Lease & Info**
- [ ] `13-lease-details.png` - Active lease information
- [ ] `14-announcements-list.png` - Landlord announcements
- [ ] `15-announcement-detail.png` - Single announcement view

**Settings**
- [ ] `16-more-screen.png` - Renter settings menu
- [ ] `17-notification-preferences.png` - Push notification settings

### Cross-Cutting Features (`features/`)

- [ ] `01-offline-banner.png` - No network connection indicator
- [ ] `02-error-state.png` - Error state with retry button
- [ ] `03-loading-state.png` - Loading skeleton/spinner
- [ ] `04-empty-state.png` - Empty list state
- [ ] `05-version-gate.png` - Update required screen
- [ ] `06-session-rejected.png` - Session expired banner
- [ ] `07-push-notification.png` - Push notification on lock screen
- [ ] `08-deep-link-handling.png` - Notification tap → app screen

---

## 🛠️ How to Capture Screenshots

### Method 1: Using iOS Simulator (Recommended)

1. **Start the app in Simulator**
   ```bash
   npm run ios
   ```

2. **Prepare demo data**
   - Sign in with test account
   - Ensure realistic data is loaded (rent amounts, dates, etc.)

3. **Capture screenshots**
   - Navigate to desired screen
   - Press `Cmd + S` in Simulator
   - Screenshots saved to Desktop by default

4. **Move to project**
   ```bash
   mv ~/Desktop/Simulator*.png screenshots/landlord/01-dashboard-home.png
   ```

### Method 2: Using Android Emulator

1. **Start the app on Android**
   ```bash
   npm run android
   ```

2. **Capture screenshots**
   - Navigate to screen
   - Click camera icon in emulator toolbar
   - Or use `Ctrl + S` (Windows/Linux) / `Cmd + S` (macOS)

3. **Find screenshots**
   - Saved to `~/Documents` or configured location
   - Move to `screenshots/` directory

### Method 3: Physical Device (Best Quality)

1. **Install development build**
   ```bash
   eas build --profile development --platform ios
   ```

2. **Install on device** via TestFlight or direct install

3. **Capture screenshots**
   - **iOS**: Press `Volume Up + Side Button`
   - **Android**: Press `Volume Down + Power Button`

4. **Transfer to computer**
   - AirDrop (iOS)
   - USB transfer or Google Photos (Android)

### Method 4: Automated Screenshot Tool (Advanced)

Use Fastlane's `snapshot` (iOS) or `screengrab` (Android) for automated captures:

```ruby
# Fastfile (Fastlane)
lane :screenshots do
  snapshot(
    devices: ["iPhone 14 Pro"],
    languages: ["en-US"],
    output_directory: "./screenshots"
  )
end
```

---

## 🎨 Post-Processing Tips

### Image Optimization

**Compress PNG files** to reduce size:
```bash
# Using ImageOptim (macOS)
open -a ImageOptim screenshots/

# Using pngquant (cross-platform)
pngquant --quality=80-100 screenshots/**/*.png
```

**Recommended tools:**
- [ImageOptim](https://imageoptim.com/) (macOS)
- [TinyPNG](https://tinypng.com/) (web-based)
- [pngquant](https://pngquant.org/) (CLI)

### Adding Device Frames

Make screenshots look more professional with device frames:

**Using Figma/Sketch:**
1. Import screenshot
2. Add device mockup (iPhone 14 Pro / Pixel 7)
3. Export as PNG

**Using Online Tools:**
- [Mockuuups Studio](https://mockuuups.studio/)
- [Screely](https://www.screely.com/)
- [Device Shots](https://deviceshots.com/)

**Using CLI:**
- [Expo Device Frames](https://docs.expo.dev/distribution/app-screenshots/)

### Creating Comparison Images

**Side-by-side comparisons** (before/after, iOS/Android):

```bash
# Using ImageMagick
convert landlord/01-dashboard-home.png renter/01-dashboard-home.png +append comparison.png
```

---

## 📖 Using Screenshots in Documentation

### README Usage

```markdown
## Screenshots

### Landlord Dashboard
<img src="screenshots/landlord/01-dashboard-home.png" width="300" alt="Landlord Dashboard" />

### M-Pesa Payment Flow
<table>
  <tr>
    <td><img src="screenshots/renter/04-payment-screen.png" width="250" /></td>
    <td><img src="screenshots/renter/06-payment-awaiting.png" width="250" /></td>
    <td><img src="screenshots/renter/07-payment-success.png" width="250" /></td>
  </tr>
  <tr>
    <td align="center">Payment Screen</td>
    <td align="center">Awaiting Confirmation</td>
    <td align="center">Payment Success</td>
  </tr>
</table>
```

### App Store / Play Store

- **Feature Graphic**: 1024×500 (Play Store)
- **Screenshots**: 5-8 images showcasing key features
- **Promo Video**: 15-30 seconds highlighting main flows

---

## 🚫 What NOT to Include

- ❌ **Real user data** (names, phone numbers, addresses)
- ❌ **Production API keys** or credentials
- ❌ **Test account passwords** visible on screen
- ❌ **Debug overlays** or development warnings
- ❌ **Unfinished features** or broken UI states
- ❌ **Lorem ipsum text** (use realistic demo data)

---

## ✅ Quality Checklist

Before committing screenshots, verify:

- [ ] No personal or sensitive data visible
- [ ] Status bar shows 9:41 with full battery/signal
- [ ] Text is readable at thumbnail size
- [ ] UI elements are not clipped or cut off
- [ ] Consistent device model across similar screenshots
- [ ] File names are descriptive and numbered
- [ ] PNG format with reasonable file size (< 500KB each)
- [ ] Screenshots represent current app design (not outdated)

---

## 🎬 Video Demos (Optional)

For portfolio or App Store previews:

### Recording App Videos

**iOS Simulator:**
```bash
xcrun simctl io booted recordVideo --codec=h264 demo.mp4
```

**Android Emulator:**
```bash
adb shell screenrecord /sdcard/demo.mp4
adb pull /sdcard/demo.mp4
```

**Physical Device:**
- **iOS**: QuickTime Player → New Screen Recording
- **Android**: Built-in screen recorder or ADB

### Video Editing

**Recommended tools:**
- [DaVinci Resolve](https://www.blackmagicdesign.com/products/davinciresolve) (free, professional)
- [ScreenFlow](https://www.telestream.net/screenflow/) (macOS)
- [Camtasia](https://www.techsmith.com/video-editor.html) (cross-platform)

**Video specs for stores:**
- **Duration**: 15-30 seconds
- **Resolution**: 1080p (1920×1080)
- **Format**: MP4 (H.264)
- **Aspect ratio**: 16:9 or portrait (9:16)

---

## 📦 Final Portfolio Package

Create a presentation-ready archive:

```bash
# Create screenshot archive
tar -czf rentmanager-screenshots.tar.gz screenshots/

# Or ZIP for Windows
powershell Compress-Archive -Path screenshots -DestinationPath rentmanager-screenshots.zip
```

**Deliverables for portfolio:**
1. ✅ All required screenshots (40+ images)
2. ✅ Device-framed versions for presentation
3. ✅ Side-by-side comparison images
4. ✅ Demo video (15-30s)
5. ✅ Feature highlight GIFs (payment flow, maintenance submission)

---

## 🔄 Maintaining Screenshots

**When to update:**
- ✨ Major UI redesign
- 🆕 New feature added
- 🐛 Visual bug fixed that was captured
- 📱 Supporting new device sizes
- 🌍 Adding localization

**Update workflow:**
1. Re-capture affected screens
2. Replace old images (keep same filenames)
3. Update README if new features added
4. Commit with clear message: `docs: update landlord dashboard screenshots`

---

## 📞 Questions?

For screenshot-related questions or suggestions:
- 📂 Open an issue: [GitHub Issues](https://github.com/hassan200503/rentmanager-mobile/issues)
- 📧 Contact: hassan200503@github.com

---

**Last Updated**: November 2, 2026  
**Screenshot Count**: 0 / 40+ required ⚠️  
**Status**: 🟡 Awaiting screenshots (structure complete)
