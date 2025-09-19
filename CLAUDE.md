# CLAUDE.md - VIOVERSE PRO PROJECT

## 🔴 CRITICAL PRIORITIES - NEVER VIOLATE
1. **DATA-DRIVEN EVERYTHING** - No hardcoded values. Every number, text, coordinate comes from master.json
2. **RESPONSIVE FIRST** - Works perfectly on mobile, tablet, and desktop (320px-1920px)
3. **SEPARATION OF CONCERNS** - Data logic, business logic, and presentation must never mix

## 🚀 PROJECT STATUS - SEPTEMBER 2025

### Current Deployment
- **GitHub Repository**: https://github.com/JeedaveyFCRA/vioverse-pro
- **Live Site**: https://vioverse-pro.onrender.com/frontend/index.html
- **Local Path**: `/home/avid_arrajeedavey/vioverse-clean-site`
- **Branch**: `fix/render-node-service`

### Build Status
- ✅ Site is LIVE and functional
- ✅ All 270 PDFs accessible with on-demand loading
- ✅ Mobile responsive with gesture controls
- ✅ No layout shifts or loading flashes
- ✅ A+ compliant (3 of 8 laws achieved)

## 🎯 CRITICAL FIXES APPLIED (September 18, 2025)

### 1. Configuration System (FIXED)
- **Master config**: `/public/data/config/master.json` controls everything
- **No hardcoding**: All paths, limits, and settings from config
- **Dynamic loading**: Config loader properly maps keys to filenames

### 2. PDF Access (FIXED)
- **All 270 PDFs accessible**: Navigation works through entire set
- **On-demand loading**: PDFs load when navigated to (saves memory)
- **Pre-load options**: Initial 3 (mobile) or 10 (desktop) + "Load All" button
- **Memory safe**: Prevents mobile Safari crashes

### 3. Mobile Experience (FIXED)
- **Gesture navigation**: Swipe left/right for PDFs, pinch to zoom
- **Collapsible controls**: Hamburger menu for nav, toggle for sidebar
- **Full viewport**: 90% screen for PDF content
- **No layout shifts**: Loading indicator absolute positioned

### 4. Desktop Experience (FIXED)
- **No jumping**: Loading box uses visibility/opacity, not display
- **Smooth transitions**: 200ms ease on all state changes
- **Consistent layout**: Fixed positioning prevents reflows

## 📱 MOBILE CONTROLS GUIDE

### Touch Gestures
- **Swipe Right →**: Next PDF
- **Swipe Left ←**: Previous PDF
- **Pinch**: Zoom in/out (0.5x to 3x)
- **Double Tap**: Reset zoom to 1x

### Toggle Buttons
- **Top Left (☰)**: Show/hide navigation menu
- **Bottom Right (📊)**: Show/hide violations panel
- **Orange Button**: Load all PDFs (desktop only)

## 🏗️ PROJECT STRUCTURE
```
vioverse-clean-site/
├── public/
│   ├── data/
│   │   ├── config/
│   │   │   ├── master.json      # Master configuration
│   │   │   └── *.json           # Individual configs
│   │   ├── csv/                 # 3 CSV files
│   │   └── pdfs/                # 270 PDF files
│   └── frontend/
│       ├── index.html            # Main entry point
│       ├── css/
│       │   ├── core.css         # Base styles
│       │   ├── layout.css       # Layout structure
│       │   └── responsive-fix.css # Mobile/responsive fixes
│       └── js/
│           ├── app.js           # Main application
│           ├── mobile-gestures.js # Touch controls
│           └── core/            # Core modules
├── app/                         # Next.js app directory
├── render.yaml                  # Render deployment config
└── package.json                 # Node dependencies
```

## ⚖️ A+ COMPLIANCE STATUS

### ✅ Achieved (3 of 8)
1. **No Hardcoding**: Everything from master.json config
2. **Responsive Design**: 320px-1920px with breakpoints
3. **Performance**: No layout shifts, lazy loading

### ⏳ Partial (1 of 8)
4. **WCAG 2.2 AA**: Keyboard nav, focus indicators, skip links

### ❌ Not Yet (4 of 8)
5. **Data-driven Config**: Still some duplication
6. **Security Headers**: Need CSP, X-Frame-Options
7. **TypeScript Strict**: Mixed JS/TS files
8. **ESLint/Tests/CI**: No test framework

## 🔧 TROUBLESHOOTING

### Problem: Loading box briefly shows
**Solution**: Already fixed - uses .active class and hidden by default

### Problem: Mobile sidebar toggle not visible
**Solution**: Already fixed - z-index: 501, moves up when open

### Problem: PDFs not loading
**Check**:
1. Verify `/public/data/pdfs/` contains files
2. Check browser console for 404 errors
3. Ensure master.json paths are correct

### Problem: Gestures not working
**Check**:
1. Mobile device or responsive mode
2. Console should show "Mobile gestures initialized"
3. Clear localStorage if hints don't appear

## 🚨 CRITICAL WARNINGS

### NEVER DO:
- ❌ Remove `display: none` from loading div
- ❌ Use `display` property for show/hide (use visibility/opacity)
- ❌ Hardcode paths or limits
- ❌ Change z-index values (carefully ordered)

### ALWAYS DO:
- ✅ Test on real mobile device
- ✅ Check for layout shifts
- ✅ Use config values from master.json
- ✅ Maintain responsive breakpoints

## 📝 RECENT COMMITS (September 18, 2025)

1. **fae3c03**: A+ Law #1 FIXED - Remove all hardcoding
2. **086c71f**: Fix config loading error - uitext.json 404
3. **b3fb0bb**: Enable access to all 270 PDFs with on-demand loading
4. **41504b9**: Fix layout shift and mobile responsiveness
5. **89c4f90**: Mobile UX improvements - no loading flash

## 🔍 KEY FILES TO MAINTAIN

### Configuration
- `/public/data/config/master.json` - All settings

### Styles
- `/public/frontend/css/responsive-fix.css` - Mobile fixes

### JavaScript
- `/public/frontend/js/app.js` - Main application
- `/public/frontend/js/mobile-gestures.js` - Touch controls

### HTML
- `/public/frontend/index.html` - Entry point

## 📱 RESPONSIVE BREAKPOINTS

- **320-767px**: Mobile (compact, gestures, overlays)
- **768-1023px**: Small tablet (280px sidebar)
- **1024-1279px**: Large tablet (320px sidebar)
- **1280-1919px**: Desktop (380px sidebar)
- **1920px+**: Ultra-wide (400px sidebar, centered)

## 🎯 PERFORMANCE METRICS

- **Initial Load**: 3-10 PDFs (device dependent)
- **Memory Limit**: 5MB mobile, 10MB desktop
- **Batch Size**: 1 PDF mobile, 3 PDFs desktop
- **Swipe Threshold**: 30px horizontal movement
- **Transition Speed**: 200ms ease

## 🔄 DEPLOYMENT PROCESS

1. Make changes locally
2. Test thoroughly (especially mobile)
3. Commit with descriptive message
4. Push to `fix/render-node-service` branch
5. Render auto-deploys in ~2-5 minutes
6. Check https://vioverse-pro.onrender.com/frontend/index.html

## 📞 SUPPORT

- **Issues**: Report at project repository
- **Documentation**: This file (CLAUDE.md)
- **Legacy Project**: DO NOT reference `/home/avid_arrajeedavey/vioverse-refactor/`

---
Last Updated: September 18, 2025, 10:30 PM