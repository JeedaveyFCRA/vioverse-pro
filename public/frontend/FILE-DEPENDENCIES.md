# File Dependencies for VIOVERSE Professional

## index-pro.html Dependencies

### Direct HTML Dependencies
1. **CSS Files:**
   - `./css/core.css` - Core styles
   - `./css/layout-pro.css` - Professional layout
   - `./css/viobox-alignment-fix.css` - VioBox alignment fixes

2. **JavaScript Files:**
   - `./js/config-loader.js` - Configuration loader
   - `./js/viobox-system.js` - VioBox rendering system
   - `./js/viobox-alignment-helper.js` - VioBox alignment helper
   - `./js/app-pro-complete.js` - Main application

3. **External CDN Dependencies:**
   - `https://unpkg.com/lucide@latest` - Icon library
   - `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js` - PDF rendering
   - `https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js` - CSV parsing

### JavaScript File Dependencies

#### config-loader.js loads:
- `./data/config/ui-config.json`

#### viobox-system.js loads:
- `./data/config/theme.json`
- `./data/config/severity.json`
- `./data/config/viobox-padding.json`
- `./data/csv/eq_violations_detailed_test.csv`
- `./data/csv/ex_violations_detailed_test.csv`
- `./data/csv/tu_violations_detailed_test.csv`

#### app-pro-complete.js loads:
- `./data/config/creditors.json`
- `./data/config/ui-config.json`
- `./data/config/theme.json`
- `./data/pdfs/[various PDF files]` (dynamically loaded based on date/bureau)

### Complete File Tree for index-pro.html:
```
index-pro.html
├── CSS Files
│   ├── ./css/core.css
│   ├── ./css/layout-pro.css
│   └── ./css/viobox-alignment-fix.css
├── JavaScript Files
│   ├── ./js/config-loader.js
│   ├── ./js/viobox-system.js
│   ├── ./js/viobox-alignment-helper.js
│   └── ./js/app-pro-complete.js
├── Configuration Files (JSON)
│   ├── ./data/config/ui-config.json
│   ├── ./data/config/theme.json
│   ├── ./data/config/severity.json
│   ├── ./data/config/viobox-padding.json
│   └── ./data/config/creditors.json
├── Data Files (CSV)
│   ├── ./data/csv/eq_violations_detailed_test.csv
│   ├── ./data/csv/ex_violations_detailed_test.csv
│   └── ./data/csv/tu_violations_detailed_test.csv
├── PDF Files (Dynamic)
│   └── ./data/pdfs/*.pdf
└── External Dependencies
    ├── Lucide Icons (CDN)
    ├── PDF.js (CDN)
    └── PapaParse (CDN)
```

---

## evidence-view.html Dependencies

### Direct HTML Dependencies
1. **CSS Files:**
   - `./css/core.css` - Core styles
   - `./css/layout-pro.css` - Professional layout
   - `./css/evidence-config-driven.css` - Evidence-specific styles

2. **JavaScript Files:**
   - `./js/config-loader.js` - Configuration loader
   - Inline script for theme loading

3. **External CDN Dependencies:**
   - `https://unpkg.com/lucide@latest` - Icon library
   - `https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js` - CSV parsing

### JavaScript File Dependencies

#### Inline script loads:
- `./data/config/theme.json`

#### config-loader.js loads:
- `./data/config/ui-config.json`

### Complete File Tree for evidence-view.html:
```
evidence-view.html
├── CSS Files
│   ├── ./css/core.css
│   ├── ./css/layout-pro.css
│   └── ./css/evidence-config-driven.css
├── JavaScript Files
│   └── ./js/config-loader.js
├── Configuration Files (JSON)
│   ├── ./data/config/theme.json
│   └── ./data/config/ui-config.json
├── Evidence Assets (Referenced but not in HTML)
│   └── ./assets/evidence/evidence/*.png
└── External Dependencies
    ├── Lucide Icons (CDN)
    └── PapaParse (CDN)
```

---

## Summary of All Unique Files Used

### CSS Files (4 total):
1. `./css/core.css`
2. `./css/layout-pro.css`
3. `./css/viobox-alignment-fix.css`
4. `./css/evidence-config-driven.css`

### JavaScript Files (5 total):
1. `./js/config-loader.js`
2. `./js/viobox-system.js`
3. `./js/viobox-alignment-helper.js`
4. `./js/app-pro-complete.js`
5. Inline scripts in evidence-view.html

### Configuration Files (6 total):
1. `./data/config/ui-config.json`
2. `./data/config/theme.json`
3. `./data/config/severity.json`
4. `./data/config/viobox-padding.json`
5. `./data/config/creditors.json`
6. `./data/config/evidence-documents.json` (likely used but not directly referenced)

### Data Files (3 CSV files):
1. `./data/csv/eq_violations_detailed_test.csv`
2. `./data/csv/ex_violations_detailed_test.csv`
3. `./data/csv/tu_violations_detailed_test.csv`

### Asset Files:
- `./data/pdfs/*.pdf` - Multiple PDF files (dynamically loaded)
- `./assets/evidence/evidence/*.png` - Evidence images (dynamically loaded)

### External CDN Dependencies (3 total):
1. Lucide Icons - `https://unpkg.com/lucide@latest`
2. PDF.js - `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js`
3. PapaParse - `https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js`

---

## Notes:
- Both pages share the same core CSS files and config-loader.js
- index-pro.html is more complex with VioBox system and PDF handling
- evidence-view.html is simpler, focused on displaying evidence images
- All configurations are data-driven from JSON files (A+ compliant)
- CSV files contain violation coordinates for VioBox rendering
- PDF files are loaded dynamically based on user selection