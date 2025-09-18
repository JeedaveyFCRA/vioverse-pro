# Frontend Architecture & Data Flow

## Overview
The VioBox Viewer is a 100% data-driven multi-bureau credit report violation analysis system. All UI text, colors, behaviors, and configurations are loaded from JSON files with zero hardcoded values.

## Quick Start

### Option 1: Development Server with Live Reload (Recommended)
```bash
# First time setup - install dependencies
./install-dev.sh

# Run development server with live reload
python3 dev-server.py
# OR if you have Node.js:
node dev-server.js

# Browser opens automatically at http://localhost:8080
# Changes to HTML/CSS/JS/JSON auto-refresh the browser!
```

### Option 2: Basic Server (No Live Reload)
```bash
# Simple Python HTTP server
./serve.sh
# Visit http://localhost:8000
```

## Architecture

### Module Structure
```
frontend/
├── index.html                 # Main HTML structure (data-driven skeleton)
├── css/
│   ├── core.css              # Base styles using CSS custom properties
│   └── layout.css            # Layout matching source exactly
├── js/
│   ├── app.js                # Main application orchestrator
│   └── core/
│       ├── config-loader.js  # Loads and validates all JSON configs
│       ├── csv-processor.js  # CSV parsing and normalization
│       ├── pdf-manager.js    # PDF rendering with PDF.js
│       └── viobox-renderer.js # Violation overlay system
└── data/
    ├── config/               # All JSON configuration files
    ├── csv/                  # CSV data files
    └── pdfs/                 # PDF documents
```

### Data Flow

1. **Configuration Loading**
   - `config-loader.js` loads all JSON files from `/data/config/`
   - Validates required fields and relationships
   - Sets CSS custom properties for theming
   - Provides config access throughout application

2. **CSV Processing Pipeline**
   - User uploads CSV files via file input
   - `Papa.parse` parses CSV with headers
   - Filters out non-violations (COMBO_, "No Violations Found")
   - Detects bureau from filename patterns
   - Groups violations by PDF filename
   - Updates statistics and UI

3. **PDF Rendering Pipeline**
   - User uploads PDF files
   - PDF.js loads documents into memory
   - Canvas renders current page with scaling
   - VioBox overlays drawn based on CSV coordinates
   - Bureau filtering applied in real-time

4. **JSON Configuration Mapping**

   **ui-text.json** → All UI strings
   - `titles.*` → Headers and section titles
   - `buttons.*` → Button labels
   - `labels.*` → Form labels and stats
   - `messages.*` → Notifications and status

   **bureaus.json** → Bureau detection and display
   - `bureaus.{code}.patterns` → Filename detection patterns
   - `bureaus.{code}.color` → Bureau-specific colors
   - `bureaus.{code}.checkboxId` → Filter checkbox IDs

   **severity.json** → Violation severity styling
   - `severityLevels.{level}.color` → Border colors
   - `severityLevels.{level}.fillColor` → Background fills
   - `severityLevels.{level}.itemClass` → CSS classes

   **theme.json** → Visual theming
   - `colors.*` → Applied as CSS variables
   - `fonts.*` → Typography settings
   - `spacing.*` → Layout spacing scale
   - `borderRadius.*` → Corner rounding

## Asset Serving

### Option A: Development Server (Implemented)
```bash
./serve.sh  # Starts Python HTTP server on port 8000
```
- Serves frontend directory with all assets
- Data files copied to `frontend/data/` for browser access
- No CORS issues as everything is same-origin

### Option B: Production Deployment
- Deploy entire `frontend/` directory to any static host
- All assets are self-contained within frontend
- No server-side processing required

## CSV Schema

Expected CSV columns (normalized by csv-processor):
```javascript
{
  pdf_filename: string,      // Target PDF file
  violation_type: string,    // Violation description
  rule_id: string,           // Rule identifier
  severity: string,          // extreme|severe|serious|minor
  x: number,                 // X coordinate
  y: number,                 // Y coordinate
  width: number,             // Box width
  height: number,            // Box height
  page: number,              // PDF page number
  bureau: string,            // TU|EX|EQ (auto-detected)
  full_text: string          // Full violation text
}
```

## Responsive Breakpoints

Defined in `breakpoints.json` and applied via CSS:
- 320px: Mobile portrait
- 480px: Mobile landscape
- 768px: Tablet
- 1024px: Desktop
- 1280px: Wide desktop

## Security Considerations

- All file processing happens client-side
- No data sent to external servers
- PDF.js runs in sandboxed mode
- CSV parsing validated against schema
- XSS protection via textContent (no innerHTML with user data)

## Accessibility Features

- Keyboard navigation supported
- Focus indicators on all controls
- ARIA labels where appropriate
- Skip link to main content
- Semantic HTML structure
- Color contrast meets WCAG AA

## Performance Optimizations

- PDF rendering on-demand (single page at a time)
- CSV data filtered without re-parsing
- CSS custom properties for instant theming
- Debounced resize handlers
- Efficient canvas redrawing

## Browser Compatibility

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

Requires:
- JavaScript ES6+ support
- Canvas API
- Fetch API
- CSS Custom Properties

## Configuration Validation

The system validates:
- Required config sections exist
- Bureau patterns are arrays
- Severity levels have required fields
- UI text sections are complete
- Theme colors are valid

Validation errors prevent app initialization with clear console messages.

## Known Limitations

1. PDFs must be loaded locally (no URL support yet)
2. Single page view only (no multi-page navigation yet)
3. CSVs must match expected schema exactly
4. Large PDFs may cause memory issues (>100MB)