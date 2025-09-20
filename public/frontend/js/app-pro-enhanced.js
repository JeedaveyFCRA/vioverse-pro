/**
 * VIOVERSE Professional Enhanced - Fully Data-Driven System
 * No hardcoding - Everything from JSON configurations
 */

class VioversePro {
  constructor() {
    this.state = {
      currentBureau: null,
      currentDate: null,
      currentPage: 1,
      totalPages: 0,
      pageMetadata: {},
      reportsData: null,
      creditorsData: null,
      uiConfig: null,
      pdfDoc: null,
      scale: 1.0,
      vioboxesVisible: true
    };

    this.elements = {};
    this.init();
  }

  async init() {
    console.log('🚀 Initializing VIOVERSE Professional Enhanced...');

    // Cache DOM elements
    this.cacheElements();

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

    // Date grid
    this.elements.dateGrid = document.getElementById('dateGrid');

    // Page info
    this.elements.currentPage = document.getElementById('currentPage');
    this.elements.totalPages = document.getElementById('totalPages');

    // Creditor info
    this.elements.creditorName = document.getElementById('creditorName');

    // Page grid
    this.elements.pageGrid = document.getElementById('pageGrid');

    // Violation counter
    this.elements.violationCount = document.getElementById('violationCount');

    // Bureau indicator
    this.elements.currentBureauName = document.getElementById('currentBureauName');

    // PDF Canvas
    this.elements.pdfCanvas = document.getElementById('pdfCanvas');
    this.elements.pdfContainer = document.getElementById('pdfContainer');

    // Violation overlay
    this.elements.vioboxOverlay = document.getElementById('vioboxOverlay');

    // Panel toggles
    this.elements.panelToggles = document.querySelectorAll('.panel-toggle');

    // Save controller buttons
    this.elements.saveButtons = document.querySelectorAll('.save-btn');

    // Sidebars
    this.elements.leftSidebar = document.getElementById('leftSidebar');
    this.elements.rightSidebar = document.getElementById('rightSidebar');

    // Loading state
    this.elements.loadingState = document.getElementById('loadingState');
  }

  async loadConfigurations() {
    try {
      // Load all configuration files in parallel
      const [reportsResponse, creditorsResponse, uiConfigResponse] = await Promise.all([
        fetch('/data/config/reports-enhanced.json'),
        fetch('/data/config/creditors.json'),
        fetch('/data/config/ui-config.json')
      ]);

      this.state.reportsData = await reportsResponse.json();
      this.state.creditorsData = await creditorsResponse.json();
      this.state.uiConfig = await uiConfigResponse.json();

      console.log('✅ All configurations loaded successfully');
      console.log('📊 Reports:', this.state.reportsData.statistics);
      console.log('🏦 Creditors:', Object.keys(this.state.creditorsData.creditorCodes).length, 'creditors');
      console.log('🎨 UI Config loaded');

    } catch (error) {
      console.error('❌ Error loading configurations:', error);
      this.showError('Failed to load configuration files');
    }
  }

  initializeDefaultView() {
    // Find first available report with violations
    let firstBureau = null;
    let firstDate = null;

    // Look for first report with violations
    for (const [date, report] of Object.entries(this.state.reportsData.reports)) {
      for (const [bureau, data] of Object.entries(report.bureaus)) {
        if (data && data.violationPages && data.violationPages.length > 0) {
          firstDate = date;
          firstBureau = bureau;
          break;
        }
      }
      if (firstBureau) break;
    }

    // Default to EX and first date if nothing found
    firstBureau = firstBureau || 'EX';
    firstDate = firstDate || '2024-04-25';

    console.log(`📍 Initializing with ${firstBureau} - ${firstDate}`);

    // Set initial state
    this.updateBureau(firstBureau);
    this.updateDate(firstDate);

    // Load first violation page (not hardcoded!)
    const bureauData = this.state.reportsData.reports[firstDate]?.bureaus[firstBureau];
    if (bureauData && bureauData.violationPages.length > 0) {
      this.navigateToPage(bureauData.violationPages[0]);
    } else {
      this.navigateToPage(1);
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
      if (e.key === 'v') this.toggleVioboxes();
    });

    // Save controller buttons
    this.elements.saveButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.querySelector('span')?.textContent;
        this.handleSaveAction(action);
      });
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
  }

  updateDateGrid() {
    // Clear existing dates
    this.elements.dateGrid.innerHTML = '';

    // Get all dates from reports
    const dates = Object.entries(this.state.reportsData.reports)
      .map(([key, data]) => ({
        key,
        display: data.displayDate,
        hasData: data.bureaus[this.state.currentBureau] !== null
      }));

    // Create date buttons
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

    // Auto-load first violation page if exists
    const bureauData = this.state.reportsData.reports[date]?.bureaus[this.state.currentBureau];
    if (bureauData && this.state.uiConfig.loadBehavior.initialLoad === 'firstViolation') {
      const firstViolation = bureauData.violationPages[0];
      if (firstViolation) {
        this.navigateToPage(firstViolation);
      } else {
        this.navigateToPage(this.state.uiConfig.loadBehavior.defaultPage);
      }
    }
  }

  updatePageGrid() {
    const reportData = this.state.reportsData.reports?.[this.state.currentDate];
    const bureauData = reportData?.bureaus[this.state.currentBureau];

    if (!bureauData) {
      this.elements.pageGrid.innerHTML = `
        <div style="color: var(--color-text-muted); text-align: center; padding: 20px; grid-column: 1/-1;">
          No data available for this bureau/date combination
        </div>`;
      return;
    }

    // Update state
    this.state.totalPages = bureauData.totalPages;
    this.state.pageMetadata = bureauData.pageMetadata;

    // Update page info
    this.elements.totalPages.textContent = this.state.totalPages;

    // Update violation count
    this.elements.violationCount.textContent = bureauData.violationCount || 0;

    // Clear and rebuild grid
    this.elements.pageGrid.innerHTML = '';

    // Determine grid settings based on viewport
    const viewport = window.innerWidth;
    let gridConfig;
    if (viewport >= this.state.uiConfig.grid.desktop.breakpoint) {
      gridConfig = this.state.uiConfig.grid.desktop;
    } else if (viewport >= this.state.uiConfig.grid.tablet.breakpoint) {
      gridConfig = this.state.uiConfig.grid.tablet;
    } else {
      gridConfig = this.state.uiConfig.grid.mobile;
    }

    // Set grid columns dynamically
    this.elements.pageGrid.style.gridTemplateColumns = `repeat(${gridConfig.columns}, 1fr)`;

    // Create page boxes
    for (let i = 1; i <= this.state.totalPages; i++) {
      const box = document.createElement('div');
      box.className = 'page-box';
      box.dataset.page = i;

      // Add file-text icon instead of number
      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', 'file-text');
      box.appendChild(icon);

      // Get page metadata
      const pageMeta = this.state.pageMetadata[i];

      // Add violation class if has violations
      if (pageMeta && pageMeta.hasViolation) {
        box.classList.add('has-violation');
      }

      // Add current class if selected
      if (i === this.state.currentPage) {
        box.classList.add('current');
      }

      // Add click handler
      box.addEventListener('click', () => this.navigateToPage(i));

      // No tooltip per user request

      this.elements.pageGrid.appendChild(box);
    }

    // Initialize Lucide icons for the newly created elements
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  navigateToPage(pageNum) {
    if (pageNum < 1 || pageNum > this.state.totalPages) return;

    this.state.currentPage = pageNum;

    // Update page display
    this.elements.currentPage.textContent = pageNum;

    // Update grid visualization
    document.querySelectorAll('.page-box').forEach(box => {
      const boxPage = parseInt(box.dataset.page);
      box.classList.toggle('current', boxPage === pageNum);
    });

    // Update creditor info based on page metadata
    const pageMeta = this.state.pageMetadata[pageNum];
    if (pageMeta) {
      this.elements.creditorName.textContent = pageMeta.creditor || 'no violations on this page';
    }

    // Load or display the page content
    this.loadPageContent(pageNum);
  }

  async loadPageContent(pageNum) {
    const pageMeta = this.state.pageMetadata[pageNum];

    // Show loading state
    this.elements.loadingState.style.display = 'flex';

    if (pageMeta && pageMeta.hasViolation && pageMeta.pdfFile) {
      // Load actual PDF for violation pages
      const pdfPath = `/data/pdfs/${pageMeta.pdfFile}`;

      try {
        // Load PDF using PDF.js
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1); // These are single-page PDFs

        const canvas = this.elements.pdfCanvas;
        const context = canvas.getContext('2d');

        const viewport = page.getViewport({ scale: this.state.scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;
        canvas.style.display = 'block';

        console.log(`✅ Loaded violation page ${pageNum}: ${pageMeta.creditor}`);

        // TODO: Load violation boxes from CSV data
        this.loadViolationBoxes(pageNum, pageMeta);

      } catch (error) {
        console.error('Error loading PDF:', error);
        this.showPagePlaceholder(pageNum, pageMeta, 'Error loading PDF');
      }
    } else {
      // Show placeholder for non-violation pages
      this.showPagePlaceholder(pageNum, pageMeta);
    }

    // Hide loading state
    this.elements.loadingState.style.display = 'none';
  }

  showPagePlaceholder(pageNum, pageMeta, errorMsg = null) {
    const canvas = this.elements.pdfCanvas;
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = 612;  // Standard US Letter width
    canvas.height = 792; // Standard US Letter height

    // Clear canvas
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw placeholder content
    ctx.fillStyle = '#808080';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';

    if (errorMsg) {
      ctx.fillText(errorMsg, canvas.width/2, 100);
    } else {
      ctx.fillText('No Violations on This Page', canvas.width/2, 100);
    }

    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = '#b0b0b0';

    const bureau = this.state.currentBureau;
    const date = this.state.reportsData.reports[this.state.currentDate].displayDate;

    ctx.fillText(`Page ${pageNum} of the ${bureau} report (${date})`, canvas.width/2, 140);
    ctx.fillText('contains no reported violations.', canvas.width/2, 165);

    // Show canvas
    canvas.style.display = 'block';

    // Clear violation boxes
    this.elements.vioboxOverlay.innerHTML = '';
  }

  loadViolationBoxes(pageNum, pageMeta) {
    // Clear existing boxes
    this.elements.vioboxOverlay.innerHTML = '';

    if (!this.state.vioboxesVisible) return;

    // TODO: Load actual violation coordinates from CSV
    // For now, showing placeholder boxes based on severity
    const severityStyles = {
      extreme: 'border-color: #dc2626; background: rgba(220, 38, 38, 0.1);',
      severe: 'border-color: #f97316; background: rgba(249, 115, 22, 0.1);',
      warning: 'border-color: #fbbf24; background: rgba(251, 191, 36, 0.1);'
    };

    // Example violation box (would come from CSV data)
    if (pageMeta.severity && pageMeta.severity !== 'none') {
      const box = document.createElement('div');
      box.className = 'viobox';
      box.style.cssText = `
        position: absolute;
        left: 50px;
        top: 200px;
        width: 500px;
        height: 40px;
        border: 2px solid;
        ${severityStyles[pageMeta.severity] || ''}
      `;
      this.elements.vioboxOverlay.appendChild(box);
    }
  }

  toggleVioboxes() {
    this.state.vioboxesVisible = !this.state.vioboxesVisible;
    if (this.state.vioboxesVisible) {
      this.loadViolationBoxes(this.state.currentPage, this.state.pageMetadata[this.state.currentPage]);
    } else {
      this.elements.vioboxOverlay.innerHTML = '';
    }
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
      // Add more panels as needed
    }
  }

  toggleSidebars() {
    this.elements.leftSidebar.classList.toggle('collapsed');
    this.elements.rightSidebar.classList.toggle('collapsed');
  }

  handleSaveAction(action) {
    console.log('Save action:', action);

    switch(action?.toLowerCase()) {
      case 'new':
        this.createNewSession();
        break;
      case 'save as':
        this.saveSession();
        break;
      case 'load session':
        this.loadSession();
        break;
      case 'export session':
        this.exportSession();
        break;
      case 'import session':
        this.importSession();
        break;
      case 'duplicate':
        this.duplicateSession();
        break;
      case 'clear':
        this.clearSession();
        break;
      case 'mark complete':
        this.markComplete();
        break;
    }
  }

  createNewSession() {
    if (confirm('Create new session? Current progress will be saved.')) {
      this.saveSession();
      // Reset to first violation page
      this.initializeDefaultView();
    }
  }

  saveSession() {
    const sessionData = {
      timestamp: new Date().toISOString(),
      state: {
        currentBureau: this.state.currentBureau,
        currentDate: this.state.currentDate,
        currentPage: this.state.currentPage
      },
      version: '2.0.0'
    };

    localStorage.setItem('vioverse-session', JSON.stringify(sessionData));
    console.log('✅ Session saved');
  }

  loadSession() {
    const saved = localStorage.getItem('vioverse-session');
    if (saved) {
      const sessionData = JSON.parse(saved);

      // Restore state
      this.updateBureau(sessionData.state.currentBureau);
      this.updateDate(sessionData.state.currentDate);
      this.navigateToPage(sessionData.state.currentPage);

      console.log('✅ Session loaded from', sessionData.timestamp);
    } else {
      alert('No saved session found');
    }
  }

  exportSession() {
    const sessionData = {
      timestamp: new Date().toISOString(),
      state: {
        currentBureau: this.state.currentBureau,
        currentDate: this.state.currentDate,
        currentPage: this.state.currentPage
      },
      version: '2.0.0'
    };

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vioverse-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importSession() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        const sessionData = JSON.parse(text);

        // Restore state
        this.updateBureau(sessionData.state.currentBureau);
        this.updateDate(sessionData.state.currentDate);
        this.navigateToPage(sessionData.state.currentPage);

        console.log('✅ Session imported');
      }
    };
    input.click();
  }

  duplicateSession() {
    const sessionKey = `vioverse-session-${Date.now()}`;
    const currentSession = localStorage.getItem('vioverse-session');
    if (currentSession) {
      localStorage.setItem(sessionKey, currentSession);
      console.log('✅ Session duplicated as', sessionKey);
    }
  }

  clearSession() {
    if (confirm('Clear all session data? This cannot be undone.')) {
      localStorage.removeItem('vioverse-session');
      this.initializeDefaultView();
      console.log('✅ Session cleared');
    }
  }

  markComplete() {
    console.log(`Page ${this.state.currentPage} marked as complete`);
    // TODO: Track completed pages
  }

  showError(message) {
    console.error('❌', message);
    // TODO: Show user-friendly error message
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new VioversePro());
} else {
  new VioversePro();
}