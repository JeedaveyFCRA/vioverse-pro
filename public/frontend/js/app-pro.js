/**
 * VIOVERSE Professional - Main Application Controller
 * Fully data-driven page grid visualization system
 */

class VioversePro {
  constructor() {
    this.state = {
      currentBureau: 'EX',
      currentDate: '2024-04-25',
      currentPage: 1,
      totalPages: 0,
      violationPages: [],
      reportsData: null,
      pdfDoc: null,
      scale: 1.0,
      vioboxesVisible: true
    };

    this.elements = {};
    this.init();
  }

  async init() {
    console.log('Initializing VIOVERSE Professional...');

    // Cache DOM elements
    this.cacheElements();

    // Load reports data
    await this.loadReportsData();

    // Set up event listeners
    this.attachEventListeners();

    // Initialize default view
    this.updateBureau('EX');
    this.updateDate('2024-04-25');

    // Load initial PDF if available
    this.loadCurrentPDF();
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
  }

  async loadReportsData() {
    try {
      const response = await fetch('/data/config/reports-master.json');
      this.state.reportsData = await response.json();
      console.log('Reports data loaded:', this.state.reportsData);
    } catch (error) {
      console.error('Error loading reports data:', error);
      // Fallback to hardcoded data if needed (for development)
      this.state.reportsData = this.getDefaultReportsData();
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
      if (e.key === 'ArrowLeft') this.previousPage();
      if (e.key === 'ArrowRight') this.nextPage();
      if (e.key === 'ArrowUp') this.previousPage();
      if (e.key === 'ArrowDown') this.nextPage();
      if (e.key === 'Escape') this.toggleSidebars();
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

    // Load PDF for current selection
    this.loadCurrentPDF();
  }

  updateDateGrid() {
    const dates = this.getAvailableDates();
    this.elements.dateGrid.innerHTML = '';

    dates.forEach(date => {
      const btn = document.createElement('button');
      btn.className = 'date-btn';
      btn.dataset.date = date.key;
      btn.textContent = date.display;

      // Check if this bureau has data for this date
      const bureauData = this.state.reportsData[date.key]?.bureaus[this.state.currentBureau];
      if (!bureauData) {
        btn.disabled = true;
        btn.style.opacity = '0.3';
      } else {
        btn.addEventListener('click', () => this.updateDate(date.key));
      }

      if (date.key === this.state.currentDate) {
        btn.classList.add('active');
      }

      this.elements.dateGrid.appendChild(btn);
    });
  }

  getAvailableDates() {
    if (!this.state.reportsData) return [];

    return Object.entries(this.state.reportsData)
      .filter(([key]) => key !== 'statistics')
      .map(([key, data]) => ({
        key,
        display: data.displayDate
      }));
  }

  updateDate(date) {
    this.state.currentDate = date;

    // Update date buttons
    document.querySelectorAll('.date-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.date === date);
    });

    // Update page grid
    this.updatePageGrid();

    // Load PDF for current selection
    this.loadCurrentPDF();
  }

  updatePageGrid() {
    const reportData = this.state.reportsData?.[this.state.currentDate];
    const bureauData = reportData?.bureaus[this.state.currentBureau];

    if (!bureauData) {
      this.elements.pageGrid.innerHTML = '<div style="color: var(--color-text-muted); text-align: center; padding: 20px;">No data available</div>';
      return;
    }

    // Update state
    this.state.totalPages = bureauData.totalPages;
    this.state.violationPages = bureauData.violationPages || [];

    // Update page info
    this.elements.totalPages.textContent = this.state.totalPages;

    // Update violation count
    this.elements.violationCount.textContent = this.state.violationPages.length;

    // Clear and rebuild grid
    this.elements.pageGrid.innerHTML = '';

    for (let i = 1; i <= this.state.totalPages; i++) {
      const box = document.createElement('div');
      box.className = 'page-box';
      box.textContent = i;
      box.dataset.page = i;

      // Check if this page has violations
      if (this.state.violationPages.includes(i)) {
        box.classList.add('has-violation');
      }

      // Check if this is current page
      if (i === this.state.currentPage) {
        box.classList.add('current');
      }

      // Add click handler
      box.addEventListener('click', () => this.navigateToPage(i));

      // Add hover tooltip
      box.title = `Page ${i}${this.state.violationPages.includes(i) ? ' (Has violations)' : ''}`;

      this.elements.pageGrid.appendChild(box);
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

    // Update creditor info based on page
    this.updateCreditorInfo(pageNum);

    // Render PDF page
    if (this.state.pdfDoc) {
      this.renderPage(pageNum);
    }
  }

  updateCreditorInfo(pageNum) {
    // This would be populated from actual violation data
    // For now, using example data
    const creditorMap = {
      12: 'citizens bank (account 2)',
      15: 'ally financial',
      18: 'capital one',
      22: 'discover card',
      // ... more mappings
    };

    const creditor = creditorMap[pageNum] || 'various creditors';
    this.elements.creditorName.textContent = creditor;
  }

  async loadCurrentPDF() {
    const bureauData = this.state.reportsData?.[this.state.currentDate]?.bureaus[this.state.currentBureau];
    if (!bureauData) return;

    // Construct PDF path
    // Format: AL-[Bureau]-[YYYY]-[MM]-[DD]-P[PageNum].pdf
    const dateParts = this.state.currentDate.split('-');
    const formattedDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;

    // Load first violation page if available, otherwise page 1
    const startPage = this.state.violationPages[0] || 1;
    const pdfPath = `/data/pdfs/AL-${this.state.currentBureau}-${formattedDate}-P${startPage.toString().padStart(2, '0')}.pdf`;

    try {
      // For now, we'll render a placeholder since individual page PDFs
      // We'd need to implement a different loading strategy
      console.log(`Would load PDF: ${pdfPath}`);
      this.navigateToPage(startPage);
    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  }

  async renderPage(pageNum) {
    // This would render the actual PDF page
    // For now, showing placeholder
    const canvas = this.elements.pdfCanvas;
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = 612;  // Standard US Letter width in points
    canvas.height = 792; // Standard US Letter height in points

    // Draw placeholder
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#333';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${pageNum}`, canvas.width/2, 100);

    ctx.font = '16px sans-serif';
    ctx.fillText(`${this.state.currentBureau} - ${this.state.currentDate}`, canvas.width/2, 140);

    if (this.state.violationPages.includes(pageNum)) {
      ctx.fillStyle = '#ff6b35';
      ctx.fillText('⚠️ This page contains violations', canvas.width/2, 180);
    }

    // Show canvas
    canvas.style.display = 'block';

    // Load violation boxes if page has violations
    if (this.state.violationPages.includes(pageNum)) {
      this.loadViolationBoxes(pageNum);
    }
  }

  loadViolationBoxes(pageNum) {
    // Clear existing boxes
    this.elements.vioboxOverlay.innerHTML = '';

    // This would load actual violation coordinates from CSV data
    // For demonstration, adding sample boxes
    const sampleViolations = [
      { x: 100, y: 200, width: 200, height: 30, severity: 'extreme' },
      { x: 100, y: 300, width: 180, height: 25, severity: 'severe' },
      { x: 320, y: 400, width: 150, height: 20, severity: 'warning' }
    ];

    sampleViolations.forEach(vio => {
      const box = document.createElement('div');
      box.className = `viobox ${vio.severity}`;
      box.style.left = `${vio.x}px`;
      box.style.top = `${vio.y}px`;
      box.style.width = `${vio.width}px`;
      box.style.height = `${vio.height}px`;

      this.elements.vioboxOverlay.appendChild(box);
    });
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
    // Toggle panel visibility
    const toggle = document.querySelector(`[data-panel="${panel}"]`);
    toggle.classList.toggle('active');

    // Handle specific panel logic
    switch(panel) {
      case 'page-navigator':
        this.elements.leftSidebar.classList.toggle('collapsed');
        break;
      case 'details':
        this.elements.rightSidebar.classList.toggle('collapsed');
        break;
      // Add more panel handlers as needed
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
      case 'clear':
        this.clearSession();
        break;
      // Add more actions as needed
    }
  }

  createNewSession() {
    if (confirm('Create new session? Current progress will be saved.')) {
      this.saveSession();
      // Reset to defaults
      this.state.currentPage = 1;
      this.updatePageGrid();
    }
  }

  saveSession() {
    const sessionData = {
      timestamp: new Date().toISOString(),
      state: this.state,
      version: '1.0.0'
    };

    localStorage.setItem('vioverse-session', JSON.stringify(sessionData));
    console.log('Session saved');
  }

  loadSession() {
    const saved = localStorage.getItem('vioverse-session');
    if (saved) {
      const sessionData = JSON.parse(saved);
      this.state = { ...this.state, ...sessionData.state };
      this.updateBureau(this.state.currentBureau);
      this.updateDate(this.state.currentDate);
      console.log('Session loaded');
    }
  }

  exportSession() {
    const sessionData = {
      timestamp: new Date().toISOString(),
      state: this.state,
      version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vioverse-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  clearSession() {
    if (confirm('Clear all session data?')) {
      localStorage.removeItem('vioverse-session');
      location.reload();
    }
  }

  // Fallback data if JSON fails to load
  getDefaultReportsData() {
    return {
      "2024-04-25": {
        displayDate: "4/25/24",
        bureaus: {
          EQ: { totalPages: 84, violationPages: [12, 15, 22, 35, 42, 57, 58] },
          EX: { totalPages: 51, violationPages: [5, 8, 12, 18, 25, 33, 41] },
          TU: { totalPages: 95, violationPages: [10, 20, 30, 45, 60, 75, 85] }
        }
      },
      "2024-08-19": {
        displayDate: "8/19/24",
        bureaus: {
          EQ: { totalPages: 41, violationPages: [1, 2, 15, 28, 35] },
          EX: null,
          TU: null
        }
      }
      // ... more dates
    };
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new VioversePro());
} else {
  new VioversePro();
}