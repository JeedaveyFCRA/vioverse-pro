/**
 * VIOVERSE Professional Complete - Fully Integrated CSV-Driven System
 * Combines page navigation with VioBox rendering from CSV data
 */

// Configure PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

class VioversePro {
  constructor() {
    this.state = {
      currentBureau: null,
      currentDate: null,
      currentPage: null,  // Data-driven: no hardcoded default page
      totalPages: 0,
      pageMetadata: {},
      reportsData: null,
      creditorsData: null,
      uiConfig: null,
      themeConfig: null,
      pdfDoc: null,
      currentPDF: null,
      baseScale: 1.0,  // Base scale for CSV coordinates
      zoomLevel: 1.0,   // User zoom level
      vioboxesVisible: true
    };

    this.elements = {};
    this.vioboxSystem = null;
    this.currentRenderTask = null;  // Track PDF render task
    this.init();
  }

  async init() {
    console.log('🚀 Initializing VIOVERSE Professional Complete...');

    // Cache DOM elements
    this.cacheElements();

    // Initialize VioBox system
    this.vioboxSystem = new VioBoxSystem();
    await this.vioboxSystem.init();

    // Load all configuration files
    await this.loadConfigurations();

    // Set up event listeners
    this.attachEventListeners();

    // Initialize with first available report
    this.initializeDefaultView();
  }

  cacheElements() {
    // Bureau buttons
    this.elements.bureauButtons = document.querySelectorAll('.bureau-btn');
    this.elements.dateGrid = document.getElementById('dateGrid');
    this.elements.currentPage = document.getElementById('currentPage');
    this.elements.totalPages = document.getElementById('totalPages');
    this.elements.creditorName = document.getElementById('creditorName');
    this.elements.pageGrid = document.getElementById('pageGrid');
    this.elements.violationCount = document.getElementById('violationCount');
    this.elements.currentBureauName = document.getElementById('currentBureauName');
    this.elements.pdfCanvas = document.getElementById('pdfCanvas');
    this.elements.pdfContainer = document.getElementById('pdfContainer');
    this.elements.vioboxOverlay = document.getElementById('vioboxOverlay');
    this.elements.panelToggles = document.querySelectorAll('.panel-toggle');
    this.elements.saveButtons = document.querySelectorAll('.save-btn');
    this.elements.leftSidebar = document.getElementById('leftSidebar');
    this.elements.rightSidebar = document.getElementById('rightSidebar');
    this.elements.loadingState = document.getElementById('loadingState');

    // Zoom controls
    this.elements.zoomIn = document.getElementById('zoomIn');
    this.elements.zoomOut = document.getElementById('zoomOut');
    this.elements.zoomLevel = document.getElementById('zoomLevel');
  }

  async loadConfigurations() {
    try {
      const [creditorsResponse, uiConfigResponse, themeResponse] = await Promise.all([
        fetch('./data/config/creditors.json'),
        fetch('./data/config/ui-config.json'),
        fetch('./data/config/theme.json')
      ]);

      this.state.creditorsData = await creditorsResponse.json();
      this.state.uiConfig = await uiConfigResponse.json();
      this.state.themeConfig = await themeResponse.json();

      // Build reports data from CSV violations instead of pre-made JSON
      this.buildReportsDataFromCSV();

      console.log('✅ All configurations loaded');

    } catch (error) {
      console.error('❌ Error loading configurations:', error);
    }
  }

  buildReportsDataFromCSV() {
    // Build report structure from VioBox system data
    const reports = {};

    console.log('📊 Building reports data from CSV...');
    console.log('VioBox violations loaded:', {
      EQ: this.vioboxSystem.violations.EQ?.length || 0,
      EX: this.vioboxSystem.violations.EX?.length || 0,
      TU: this.vioboxSystem.violations.TU?.length || 0
    });

    // Define all possible dates and bureaus with total pages
    const reportDefinitions = {
      '2024-04-25': {
        displayDate: '4/25/24',
        bureaus: { EQ: 84, EX: 51, TU: 95 }
      },
      '2024-08-19': {
        displayDate: '8/19/24',
        bureaus: { EQ: 41, EX: null, TU: null }
      },
      '2025-02-10': {
        displayDate: '2/10/25',
        bureaus: { EQ: 73, EX: 50, TU: 91 }
      },
      '2025-03-02': {
        displayDate: '3/2/25',
        bureaus: { EQ: 73, EX: 47, TU: 92 }
      },
      '2025-03-13': {
        displayDate: '3/13/25',
        bureaus: { EQ: 64, EX: 48, TU: 94 }
      },
      '2025-03-20': {
        displayDate: '3/20/25',
        bureaus: { EQ: 16, EX: 45, TU: null }
      },
      '2025-03-22': {
        displayDate: '3/22/25',
        bureaus: { EQ: 63, EX: null, TU: 88 }
      },
      '2025-04-02': {
        displayDate: '4/2/25',
        bureaus: { EQ: 65, EX: 44, TU: 91 }
      },
      '2025-04-14': {
        displayDate: '4/14/25',
        bureaus: { EQ: 65, EX: 45, TU: 83 }
      },
      '2025-05-25': {
        displayDate: '5/25/25',
        bureaus: { EQ: 65, EX: 45, TU: 82 }
      },
      '2025-07-09': {
        displayDate: '7/9/25',
        bureaus: { EQ: 22, EX: 44, TU: 81 }
      },
      '2025-08-10': {
        displayDate: '8/10/25',
        bureaus: { EQ: 22, EX: null, TU: 81 }
      },
      '2025-08-24': {
        displayDate: '8/24/25',
        bureaus: { EQ: null, EX: null, TU: 25 }
      }
    };

    // Build report structure with violation pages from CSV
    Object.entries(reportDefinitions).forEach(([date, def]) => {
      reports[date] = {
        displayDate: def.displayDate,
        bureaus: {}
      };

      Object.entries(def.bureaus).forEach(([bureau, totalPages]) => {
        if (totalPages === null) {
          reports[date].bureaus[bureau] = null;
        } else {
          // Get violation pages from CSV data
          const violationPages = this.vioboxSystem.getViolationPagesForBureauDate(bureau, date);

          // Build page metadata
          const pageMetadata = {};
          for (let i = 1; i <= totalPages; i++) {
            // Check if this specific page actually has violations (data-driven)
            const pdfFile = this.buildPDFFilename(bureau, date, i);

            // Debug logging for problematic pages
            if ((bureau === 'EQ' && i === 16) || (bureau === 'TU' && [2,4,6,7].includes(i))) {
              console.log(`🔍 Debug Page ${i} for ${bureau} ${date}:`, {
                pdfFile,
                exists: !!pdfFile
              });
            }

            if (pdfFile) {
              // Found a PDF file for this page - check if it has violations
              const violations = this.vioboxSystem.getViolationsForPDF(pdfFile);

              // Debug logging for violations
              if ((bureau === 'EQ' && i === 16) || (bureau === 'TU' && [2,4,6,7].includes(i))) {
                console.log(`  → Violations found for ${pdfFile}:`, violations.length);
              }

              if (violations.length > 0) {
                // This specific PDF has violations
                const creditorCode = pdfFile.substring(0, 2);
                const creditorInfo = this.state.creditorsData.creditorCodes[creditorCode];

                pageMetadata[i] = {
                  hasViolation: true,
                  creditor: creditorInfo ? creditorInfo.displayName : creditorCode.toLowerCase(),
                  creditorCode: creditorCode,
                  severity: violations[0].severity,
                  pdfFile: pdfFile,
                  violationCount: violations.length
                };
              } else {
                // PDF exists but has no violations
                pageMetadata[i] = {
                  hasViolation: false,
                  creditor: 'no violations on this page',
                  creditorCode: null,
                  severity: 'none',
                  pdfFile: pdfFile
                };
              }
            } else {
              // No PDF file found for this page
              pageMetadata[i] = {
                hasViolation: false,
                creditor: 'no violations on this page',
                creditorCode: null,
                severity: 'none'
              };
            }
          }

          reports[date].bureaus[bureau] = {
            totalPages: totalPages,
            violationPages: violationPages,
            violationCount: violationPages.length,
            pageMetadata: pageMetadata
          };
        }
      });
    });

    this.state.reportsData = { reports };

    // Get statistics from VioBox system
    const stats = this.vioboxSystem.getStatistics();
    console.log('📊 Report structure built from CSV:', stats);
  }

  buildPDFFilename(bureau, date, pageNum) {
    // Look through actual violations to find ANY PDF for this page
    const violations = this.vioboxSystem.violations[bureau] || [];

    // First check for AL (primary report)
    const pageStr = pageNum.toString().padStart(2, '0');
    const primaryPDF = `AL-${bureau}-${date}-P${pageStr}.pdf`;

    if (violations.some(v => v.pdfFile === primaryPDF)) {
      return primaryPDF;
    }

    // Check for any other creditor PDF on this page
    for (const violation of violations) {
      if (violation.pdfFile.includes(date)) {
        const pageMatch = violation.pdfFile.match(/-P(\d+)\.pdf$/);
        if (pageMatch && parseInt(pageMatch[1]) === pageNum) {
          return violation.pdfFile;
        }
      }
    }

    // No PDF found for this page
    return null;
  }

  initializeDefaultView() {
    // Find first available report with violations
    let firstBureau = null;
    let firstDate = null;
    let firstPage = null;

    console.log('🔍 Looking for initial view in reportsData:', this.state.reportsData);

    if (!this.state.reportsData || !this.state.reportsData.reports) {
      console.error('❌ No reports data available!');
      this.state.reportsData = { reports: {} };
    }

    for (const [date, report] of Object.entries(this.state.reportsData.reports)) {
      for (const [bureau, data] of Object.entries(report.bureaus)) {
        if (data && data.violationPages && data.violationPages.length > 0) {
          firstDate = date;
          firstBureau = bureau;
          firstPage = data.violationPages[0];
          break;
        }
      }
      if (firstBureau) break;
    }

    // Default fallbacks (data-driven - no page if no violations)
    if (!firstBureau || !firstDate) {
      // Get first available date from the data
      const availableDates = Object.keys(this.state.reportsData.reports || {});
      if (availableDates.length > 0) {
        firstDate = firstDate || availableDates[0];
        const report = this.state.reportsData.reports[firstDate];
        const availableBureaus = Object.keys(report?.bureaus || {});
        firstBureau = firstBureau || availableBureaus[0] || 'EX';
      } else {
        // No data at all - use safe defaults
        firstBureau = 'EX';
        firstDate = Object.keys(this.state.reportsData.reports || {})[0] || '2025-02-10';
      }
    }
    // firstPage remains null if no violations found (data-driven)

    console.log(`📍 Initializing with ${firstBureau} - ${firstDate} - Page ${firstPage || 'none'}`);

    // Set initial state - updateDate will auto-load the first violation page
    this.state.currentBureau = firstBureau;
    this.state.currentDate = firstDate;

    // Update UI elements
    this.elements.bureauButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bureau === firstBureau);
    });
    this.elements.currentBureauName.textContent = firstBureau.toLowerCase();

    // Update grids and auto-load
    this.updateDateGrid();
    this.updatePageGrid();

    // Auto-load first violation page if available
    if (firstPage !== null) {
      console.log(`🚀 Initial load: navigating to page ${firstPage}`);
      this.navigateToPage(firstPage);
    } else {
      console.log(`⚠️ No violations found on initial load`);
      this.elements.currentPage.textContent = '-';
    }
  }

  attachEventListeners() {
    // Bureau buttons
    this.elements.bureauButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const bureau = btn.dataset.bureau;
        this.updateBureau(bureau);
      });
    });

    // Panel toggles
    this.elements.panelToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const panel = toggle.dataset.panel;
        this.togglePanel(panel);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') this.previousPage();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') this.nextPage();
      if (e.key === 'Escape') this.toggleSidebars();
      if (e.key === 'v' || e.key === 'V') this.toggleVioBoxes();
      if (e.key === '+' || e.key === '=') this.zoomIn();
      if (e.key === '-' || e.key === '_') this.zoomOut();
      if (e.key === '0') this.resetZoom();
    });

    // Save controller
    this.elements.saveButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.querySelector('span')?.textContent;
        this.handleSaveAction(action);
      });
    });

    // Listen for viobox clicks
    window.addEventListener('viobox-clicked', (e) => {
      this.showViolationDetails(e.detail);
    });

    // Zoom button clicks
    if (this.elements.zoomIn) {
      this.elements.zoomIn.addEventListener('click', () => this.zoomIn());
    }
    if (this.elements.zoomOut) {
      this.elements.zoomOut.addEventListener('click', () => this.zoomOut());
    }

    // Window resize handler to maintain alignment and recalculate fit-to-width
    window.addEventListener('resize', () => {
      if (this.state.currentPDF) {
        // Debounce the resize handler (from config)
        const pdfConfig = this.state.uiConfig?.pdf || {};
        const debounceMs = pdfConfig.resizeDebounceMs || 100;

        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          // Reload PDF with new fit-to-width calculation if enabled
          if (pdfConfig.enableResponsiveResize !== false) {
            this.loadPDF(this.state.currentPDF);
          } else if (window.VioBoxAlignmentHelper) {
            // Just sync overlay if responsive resize disabled
            window.VioBoxAlignmentHelper.syncOverlayToCanvas(
              this.elements.pdfCanvas,
              this.elements.vioboxOverlay
            );
          }
        }, debounceMs);
      }
    });
  }

  updateBureau(bureau) {
    this.state.currentBureau = bureau;

    // Update button states
    this.elements.bureauButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bureau === bureau);
    });

    // Update bureau indicator
    this.elements.currentBureauName.textContent = bureau.toLowerCase();

    // Update available dates
    this.updateDateGrid();

    // Update page grid
    this.updatePageGrid();

    // Auto-load first violation page when switching bureaus
    if (this.state.currentDate) {
      const bureauData = this.state.reportsData.reports[this.state.currentDate]?.bureaus[this.state.currentBureau];
      if (bureauData && bureauData.violationPages && bureauData.violationPages.length > 0) {
        console.log(`🎯 Auto-loading first violation page: ${bureauData.violationPages[0]} for ${bureau}`);
        this.navigateToPage(bureauData.violationPages[0]);
      } else {
        // No violations for this bureau/date combo - clear the display
        console.log(`⚠️ No violations found for ${bureau} on ${this.state.currentDate}`);
        this.state.currentPage = null;
        this.elements.currentPage.textContent = '-';
        // Clear the PDF canvas
        const ctx = this.elements.pdfCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.elements.pdfCanvas.width, this.elements.pdfCanvas.height);
        // Clear VioBoxes
        this.vioboxSystem.clearVioBoxes();
      }
    }
  }

  updateDateGrid() {
    this.elements.dateGrid.innerHTML = '';

    const dates = Object.entries(this.state.reportsData.reports)
      .map(([key, data]) => ({
        key,
        display: data.displayDate,
        hasData: data.bureaus[this.state.currentBureau] !== null
      }));

    dates.forEach(date => {
      const btn = document.createElement('button');
      btn.className = 'date-btn';
      btn.dataset.date = date.key;
      btn.textContent = date.display;

      if (!date.hasData) {
        btn.disabled = true;
        btn.style.opacity = '0.3';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.addEventListener('click', () => this.updateDate(date.key));
      }

      if (date.key === this.state.currentDate) {
        btn.classList.add('active');
      }

      this.elements.dateGrid.appendChild(btn);
    });
  }

  updateDate(date) {
    this.state.currentDate = date;

    // Update date buttons
    document.querySelectorAll('.date-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.date === date);
    });

    // Update page grid
    this.updatePageGrid();

    // Auto-load first violation page (data-driven)
    const bureauData = this.state.reportsData.reports[date]?.bureaus[this.state.currentBureau];
    if (bureauData && bureauData.violationPages && bureauData.violationPages.length > 0) {
      console.log(`📅 Auto-loading first violation page: ${bureauData.violationPages[0]} for date ${date}`);
      this.navigateToPage(bureauData.violationPages[0]);
    } else {
      // No violations - clear the display
      console.log(`⚠️ No violations found for ${this.state.currentBureau} on ${date}`);
      this.state.currentPage = null;
      this.elements.currentPage.textContent = '-';
      // Clear the PDF canvas
      const ctx = this.elements.pdfCanvas.getContext('2d');
      ctx.clearRect(0, 0, this.elements.pdfCanvas.width, this.elements.pdfCanvas.height);
      // Clear VioBoxes
      this.vioboxSystem.clearVioBoxes();
    }
  }

  updatePageGrid() {
    const reportData = this.state.reportsData.reports?.[this.state.currentDate];
    const bureauData = reportData?.bureaus[this.state.currentBureau];

    if (!bureauData) {
      const padding = this.state.themeConfig?.grid?.padding || '20px';
      const textColor = this.state.themeConfig?.colors?.mutedForeground || '#808080';
      this.elements.pageGrid.innerHTML = `<div style="color: ${textColor}; text-align: center; padding: ${padding}; grid-column: 1/-1;">No data available</div>`;
      return;
    }

    this.state.totalPages = bureauData.totalPages;
    this.state.pageMetadata = bureauData.pageMetadata;

    this.elements.totalPages.textContent = this.state.totalPages;
    this.elements.violationCount.textContent = bureauData.violationCount || 0;

    this.elements.pageGrid.innerHTML = '';

    // Determine grid settings
    const viewport = window.innerWidth;
    let gridConfig;
    if (viewport >= 1280) {
      gridConfig = this.state.uiConfig.grid.desktop;
    } else if (viewport >= 768) {
      gridConfig = this.state.uiConfig.grid.tablet;
    } else {
      gridConfig = this.state.uiConfig.grid.mobile;
    }

    this.elements.pageGrid.style.gridTemplateColumns = `repeat(${gridConfig.columns}, 1fr)`;

    // Create page boxes
    for (let i = 1; i <= this.state.totalPages; i++) {
      const box = document.createElement('div');
      box.className = 'page-box';
      box.dataset.page = i;

      const pageMeta = this.state.pageMetadata[i];

      // Icons on violation pages (orange) AND current page (red)
      if ((pageMeta && pageMeta.hasViolation) || (this.state.currentPage !== null && i === this.state.currentPage)) {
        this.addIconToBox(box);
      }

      if (pageMeta && pageMeta.hasViolation) {
        box.classList.add('has-violation');
      }

      // Only mark as current if currentPage is set (data-driven)
      if (this.state.currentPage !== null && i === this.state.currentPage) {
        box.classList.add('current');
      }

      box.addEventListener('click', () => this.navigateToPage(i));

      this.elements.pageGrid.appendChild(box);
    }

    // Icons are already added as SVGs, no need to call createIcons()
  }

  navigateToPage(pageNum) {
    if (pageNum < 1 || pageNum > this.state.totalPages) return;

    const previousPage = this.state.currentPage;
    this.state.currentPage = pageNum;

    this.elements.currentPage.textContent = pageNum || '-';

    // Update grid visualization and icons (data-driven)
    document.querySelectorAll('.page-box').forEach(box => {
      const boxPage = parseInt(box.dataset.page);
      const pageMeta = this.state.pageMetadata[boxPage];
      const hasViolation = pageMeta && pageMeta.hasViolation;
      const isCurrent = boxPage === pageNum;

      // Update current class
      box.classList.toggle('current', isCurrent);

      // Icons should appear on violation pages (orange) AND current page (red)
      const shouldHaveIcon = hasViolation || isCurrent;
      const hasIcon = box.querySelector('svg.lucide-icon');

      if (shouldHaveIcon && !hasIcon) {
        // Add icon if it should have one but doesn't
        this.addIconToBox(box);
      } else if (!shouldHaveIcon && hasIcon) {
        // Remove icon if it shouldn't have one
        hasIcon.remove();
      }
    });

    // Update creditor info
    const pageMeta = this.state.pageMetadata[pageNum];
    if (pageMeta) {
      this.elements.creditorName.textContent = pageMeta.creditor || 'no violations on this page';
    }

    // Load page content
    this.loadPageContent(pageNum);
  }

  async loadPageContent(pageNum) {
    const pageMeta = this.state.pageMetadata[pageNum];

    // Show loading
    this.elements.loadingState.style.display = 'flex';

    if (pageMeta && pageMeta.hasViolation && pageMeta.pdfFile) {
      // Load actual PDF for violation pages
      await this.loadPDF(pageMeta.pdfFile);
    } else {
      // Show placeholder for non-violation pages
      this.showPagePlaceholder(pageNum, pageMeta);
    }

    // Hide loading
    this.elements.loadingState.style.display = 'none';
  }

  async loadPDF(pdfFilename) {
    const pdfPath = `./data/pdfs/${pdfFilename}`;
    console.log(`📄 Loading PDF: ${pdfFilename}`);

    // Cancel any existing render task to prevent canvas conflict
    if (this.currentRenderTask) {
      try {
        await this.currentRenderTask.cancel();
      } catch (e) {
        // Ignore cancellation errors
      }
      this.currentRenderTask = null;

      // Wait a bit to ensure canvas is fully released
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    try {
      const loadingTask = pdfjsLib.getDocument(pdfPath);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const canvas = this.elements.pdfCanvas;
      const context = canvas.getContext('2d');

      // Clear canvas before rendering
      context.clearRect(0, 0, canvas.width, canvas.height);

      // A+ Compliant: Calculate best fit scale (considers both width and height)
      const container = this.elements.pdfContainer;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Get padding from config (fallback to 40 if not set)
      const padding = this.state.uiConfig?.pdf?.containerPadding || 40;
      const availableWidth = containerWidth - padding;
      const availableHeight = containerHeight - padding;

      // Get PDF's natural dimensions
      const defaultViewport = page.getViewport({ scale: 1.0 });
      const pdfWidth = defaultViewport.width;
      const pdfHeight = defaultViewport.height;

      // Calculate scale to fit both width and height
      const scaleX = availableWidth / pdfWidth;
      const scaleY = availableHeight / pdfHeight;

      // Use the smaller scale to ensure PDF fits completely
      // But ensure minimum reasonable size (at least 1.0 for readability)
      const fitScale = Math.max(Math.min(scaleX, scaleY), 1.0);

      // Store as base scale and apply user zoom
      this.state.baseScale = fitScale;
      const scale = this.state.baseScale * this.state.zoomLevel;
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // CRITICAL: Sync overlay dimensions with canvas using helper
      if (window.VioBoxAlignmentHelper) {
        window.VioBoxAlignmentHelper.syncOverlayToCanvas(canvas, this.elements.vioboxOverlay);
      } else {
        // Fallback if helper not loaded
        const overlay = this.elements.vioboxOverlay;
        overlay.style.width = `${viewport.width}px`;
        overlay.style.height = `${viewport.height}px`;
      }

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      // Cancel any existing render task
      if (this.currentRenderTask) {
        try {
          this.currentRenderTask.cancel();
        } catch (e) {
          // Task may already be complete
        }
      }

      // Store and execute new render task
      this.currentRenderTask = page.render(renderContext);
      await this.currentRenderTask.promise;
      canvas.style.display = 'block';

      // Store current PDF info
      this.state.currentPDF = pdfFilename;

      // Render vioboxes from CSV data at same scale
      this.vioboxSystem.renderVioBoxes(this.elements.vioboxOverlay, pdfFilename, scale);

      // Sync overlay alignment with canvas
      if (window.VioBoxAlignmentHelper) {
        window.VioBoxAlignmentHelper.syncOverlayToCanvas(canvas, this.elements.vioboxOverlay);
      }

      console.log(`✅ PDF loaded with ${this.vioboxSystem.getViolationsForPDF(pdfFilename).length} violations`);

    } catch (error) {
      console.error('Error loading PDF:', error);
      this.showPagePlaceholder(this.state.currentPage, null, 'Error loading PDF');
    }
  }

  showPagePlaceholder(pageNum, pageMeta, errorMsg = null) {
    const canvas = this.elements.pdfCanvas;

    // Don't show error message on initial load
    if (errorMsg && this.state.currentPage === null) {
      errorMsg = null;
    }
    const ctx = canvas.getContext('2d');

    canvas.width = 612;
    canvas.height = 792;

    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#808080';
    const headingSize = this.state.themeConfig?.canvas?.fontSize?.heading || '24px';
    const fontFamily = this.state.themeConfig?.fonts?.sans || 'Inter, sans-serif';
    const fontWeight = this.state.themeConfig?.canvas?.fontWeight?.bold || 'bold';
    ctx.font = `${fontWeight} ${headingSize} ${fontFamily}`;
    ctx.textAlign = 'center';

    if (errorMsg) {
      ctx.fillText(errorMsg, canvas.width/2, 100);
    } else {
      ctx.fillText('No Violations on This Page', canvas.width/2, 100);
    }

    const bodySize = this.state.themeConfig?.canvas?.fontSize?.body || '16px';
    ctx.font = `${bodySize} ${fontFamily}`;
    ctx.fillStyle = '#b0b0b0';

    const bureau = this.state.currentBureau;
    const date = this.state.reportsData.reports[this.state.currentDate].displayDate;

    ctx.fillText(`Page ${pageNum} of the ${bureau} report (${date})`, canvas.width/2, 140);
    ctx.fillText('contains no reported violations.', canvas.width/2, 165);

    canvas.style.display = 'block';

    // Clear vioboxes
    this.elements.vioboxOverlay.innerHTML = '';
  }

  toggleVioBoxes() {
    const visible = this.vioboxSystem.toggleVioBoxes();
    console.log(`VioBoxes ${visible ? 'shown' : 'hidden'}`);

    // Re-render if visible and we have a current PDF
    if (visible && this.state.currentPDF) {
      // Use the same scale calculation as in loadPDF
      const scale = this.state.baseScale * this.state.zoomLevel;
      this.vioboxSystem.renderVioBoxes(
        this.elements.vioboxOverlay,
        this.state.currentPDF,
        scale
      );
    }
  }

  showViolationDetails(violation) {
    // Update right sidebar with violation details
    console.log('Show violation details:', violation);
    // TODO: Update violation details panel
  }

  togglePanel(panel) {
    const toggle = document.querySelector(`[data-panel="${panel}"]`);
    toggle.classList.toggle('active');

    switch(panel) {
      case 'page-navigator':
        this.elements.leftSidebar.classList.toggle('collapsed');
        break;
      case 'details':
        this.elements.rightSidebar.classList.toggle('collapsed');
        break;
    }
  }

  toggleSidebars() {
    this.elements.leftSidebar.classList.toggle('collapsed');
    this.elements.rightSidebar.classList.toggle('collapsed');
  }

  nextPage() {
    if (this.state.currentPage < this.state.totalPages) {
      this.navigateToPage(this.state.currentPage + 1);
    }
  }

  previousPage() {
    if (this.state.currentPage > 1) {
      this.navigateToPage(this.state.currentPage - 1);
    }
  }

  handleSaveAction(action) {
    console.log('Save action:', action);
    // Implementation for save actions...
  }

  zoomIn() {
    // A+ Compliant: Get zoom settings from config
    const pdfConfig = this.state.uiConfig?.pdf || {};
    const scaleStep = pdfConfig.scaleStep || 1.2;
    const maxScale = pdfConfig.maxScale || 3.0;

    this.state.zoomLevel = Math.min(this.state.zoomLevel * scaleStep, maxScale);
    this.updateZoomDisplay();

    // Re-render current PDF with new zoom
    if (this.state.currentPDF) {
      this.loadPDF(this.state.currentPDF).then(() => {
        // Sync overlay after PDF render completes
        if (window.VioBoxAlignmentHelper) {
          window.VioBoxAlignmentHelper.syncOverlayToCanvas(
            this.elements.pdfCanvas,
            this.elements.vioboxOverlay
          );
        }
      });
    }
  }

  zoomOut() {
    // A+ Compliant: Get zoom settings from config
    const pdfConfig = this.state.uiConfig?.pdf || {};
    const scaleStep = pdfConfig.scaleStep || 1.2;
    const minScale = pdfConfig.minScale || 0.5;

    this.state.zoomLevel = Math.max(this.state.zoomLevel / scaleStep, minScale);
    this.updateZoomDisplay();

    // Re-render current PDF with new zoom
    if (this.state.currentPDF) {
      this.loadPDF(this.state.currentPDF).then(() => {
        // Sync overlay after PDF render completes
        if (window.VioBoxAlignmentHelper) {
          window.VioBoxAlignmentHelper.syncOverlayToCanvas(
            this.elements.pdfCanvas,
            this.elements.vioboxOverlay
          );
        }
      });
    }
  }

  // Helper method to add icon directly as SVG without using createIcons()
  addIconToBox(box) {
    // Check if icon already exists
    if (box.querySelector('svg.lucide-icon')) {
      return; // Icon already exists, don't add duplicate
    }

    // Create SVG icon directly
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.classList.add('lucide-icon');

    // File-text icon path
    svg.innerHTML = '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>';

    box.appendChild(svg);
  }

  resetZoom() {
    this.state.zoomLevel = 1.0;
    this.updateZoomDisplay();

    // Re-render current PDF
    if (this.state.currentPDF) {
      this.loadPDF(this.state.currentPDF).then(() => {
        // Sync overlay after PDF render completes
        if (window.VioBoxAlignmentHelper) {
          window.VioBoxAlignmentHelper.syncOverlayToCanvas(
            this.elements.pdfCanvas,
            this.elements.vioboxOverlay
          );
        }
      });
    }
  }

  updateZoomDisplay() {
    const zoomPercent = (this.state.zoomLevel * 100).toFixed(0) + '%';
    if (this.elements.zoomLevel) {
      this.elements.zoomLevel.textContent = zoomPercent;
    }
    console.log(`Zoom: ${zoomPercent}`);
  }
}

// Initialize app AFTER config loader completes
async function initializeApp() {
  // Config loader self-initializes, just create the app
  console.log('Initializing VioversePro app...');
  new VioversePro();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}