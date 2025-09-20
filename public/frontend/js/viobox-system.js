/**
 * VioBox System - CSV-Driven Violation Box Renderer
 * Loads violation coordinates from CSV files and renders boxes on PDFs
 */

class VioBoxSystem {
  constructor() {
    this.violations = {
      EQ: [],
      EX: [],
      TU: []
    };

    this.severityColors = {
      Extreme: {
        border: '#dc2626',
        background: 'rgba(220, 38, 38, 0.15)',
        text: '#ff0000'
      },
      Severe: {
        border: '#f97316',
        background: 'rgba(249, 115, 22, 0.15)',
        text: '#ff6b35'
      },
      Warning: {
        border: '#fbbf24',
        background: 'rgba(251, 191, 36, 0.15)',
        text: '#fbbf24'
      },
      Moderate: {
        border: '#60a5fa',
        background: 'rgba(96, 165, 250, 0.15)',
        text: '#60a5fa'
      },
      Minor: {
        border: '#86efac',
        background: 'rgba(134, 239, 172, 0.15)',
        text: '#86efac'
      }
    };

    this.currentScale = 1.0;
    this.vioboxesVisible = true;
    this.initialized = false;
    this.vioboxPadding = 0; // Will be loaded from config
  }

  async init() {
    console.log('🎯 Initializing VioBox System...');

    // Load padding configuration (data-driven)
    await this.loadPaddingConfig();

    // Load CSV data
    await this.loadAllCSVData();

    this.initialized = true;
    console.log('✅ VioBox System initialized with', this.getTotalViolations(), 'violations');
    console.log('📐 VioBox padding:', this.vioboxPadding + 'px');
  }

  async loadPaddingConfig() {
    try {
      const response = await fetch('/data/config/viobox-padding.json');
      const config = await response.json();
      this.vioboxPadding = config.vioboxPadding || 0;
    } catch (error) {
      console.warn('⚠️ Could not load padding config, using default (0):', error);
      this.vioboxPadding = 0;
    }
  }

  async loadAllCSVData() {
    const csvFiles = [
      { bureau: 'EQ', file: '../data/csv/eq_violations_detailed_test.csv' },
      { bureau: 'EX', file: '../data/csv/ex_violations_detailed_test.csv' },
      { bureau: 'TU', file: '../data/csv/tu_violations_detailed_test.csv' }
    ];

    // Load all CSV files in parallel
    const promises = csvFiles.map(({ bureau, file }) => this.loadCSV(bureau, file));
    await Promise.all(promises);

    // Create index for quick lookups
    this.createViolationIndex();
  }

  async loadCSV(bureau, filepath) {
    try {
      const response = await fetch(filepath);
      const csvText = await response.text();

      // Parse CSV using PapaParse
      const parsed = Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });

      if (parsed.errors.length > 0) {
        console.warn(`⚠️ CSV parsing warnings for ${bureau}:`, parsed.errors);
      }

      // Store violations for this bureau
      this.violations[bureau] = parsed.data.map(row => ({
        pdfFile: row.pdf_filename,
        ruleId: row.rule_id,
        violationType: row.violation_type,
        severity: row.severity,
        fullText: row.full_text,
        x: parseFloat(row.x),
        y: parseFloat(row.y),
        width: parseFloat(row.width),
        height: parseFloat(row.height),
        page: parseInt(row.page) || 1,
        bureau: bureau
      }));

      console.log(`📊 Loaded ${this.violations[bureau].length} violations for ${bureau}`);

    } catch (error) {
      console.error(`❌ Error loading CSV for ${bureau}:`, error);
      this.violations[bureau] = [];
    }
  }

  createViolationIndex() {
    // Create a map for quick lookup by PDF filename
    this.violationsByPDF = {};

    Object.entries(this.violations).forEach(([bureau, violations]) => {
      violations.forEach(violation => {
        const key = violation.pdfFile;
        if (!this.violationsByPDF[key]) {
          this.violationsByPDF[key] = [];
        }
        this.violationsByPDF[key].push(violation);
      });
    });

    console.log(`📁 Indexed violations for ${Object.keys(this.violationsByPDF).length} PDFs`);
  }

  getTotalViolations() {
    return Object.values(this.violations).reduce((sum, arr) => sum + arr.length, 0);
  }

  getViolationsForPDF(pdfFilename) {
    return this.violationsByPDF[pdfFilename] || [];
  }

  getViolationPagesForBureauDate(bureau, date) {
    // Get unique page numbers that have violations
    const pages = new Set();

    this.violations[bureau].forEach(violation => {
      // Extract date from PDF filename (AL-EQ-2024-04-25-P57.pdf)
      const match = violation.pdfFile.match(/\d{4}-\d{2}-\d{2}/);
      if (match && match[0] === date) {
        // Extract page number
        const pageMatch = violation.pdfFile.match(/-P(\d+)\.pdf$/);
        if (pageMatch) {
          pages.add(parseInt(pageMatch[1]));
        }
      }
    });

    return Array.from(pages).sort((a, b) => a - b);
  }

  renderVioBoxes(container, pdfFilename, scale = 1.0) {
    if (!this.vioboxesVisible) return;

    // Clear existing boxes
    container.innerHTML = '';

    // Get violations for this PDF
    const violations = this.getViolationsForPDF(pdfFilename);

    if (violations.length === 0) {
      console.log(`No violations found for ${pdfFilename}`);
      return;
    }

    console.log(`🎯 Rendering ${violations.length} vioboxes for ${pdfFilename}`);

    // Create vioboxes
    violations.forEach((violation, index) => {
      const box = this.createVioBox(violation, scale, index);
      container.appendChild(box);
    });
  }

  createVioBox(violation, scale, index) {
    const box = document.createElement('div');
    box.className = 'viobox';
    box.dataset.severity = violation.severity;
    box.dataset.index = index;

    // Apply scaled coordinates (CSV values are the truth)
    const scaledX = violation.x * scale;
    const scaledWidth = violation.width * scale;
    const scaledHeight = violation.height * scale;

    // CRITICAL: Y coordinate in CSV is at BOTTOM of box, need to subtract height
    const scaledY = (violation.y * scale) - scaledHeight;

    // Apply data-driven padding (expands from center point)
    const padding = this.vioboxPadding;
    const paddedX = scaledX - (padding / 2);
    const paddedY = scaledY - (padding / 2);
    const paddedWidth = scaledWidth + padding;
    const paddedHeight = scaledHeight + padding;

    // Get severity colors
    const colors = this.severityColors[violation.severity] || this.severityColors.Warning;

    // Set styles with padded dimensions
    box.style.cssText = `
      position: absolute;
      left: ${paddedX}px;
      top: ${paddedY}px;
      width: ${paddedWidth}px;
      height: ${paddedHeight}px;
      border: 2px solid ${colors.border};
      background: ${colors.background};
      cursor: pointer;
      pointer-events: all;
      transition: all 0.2s ease;
      z-index: ${100 + index};
    `;

    // Add hover effect
    box.addEventListener('mouseenter', (e) => {
      box.style.borderWidth = '3px';
      box.style.zIndex = '1000';
      this.showTooltip(e, violation);
    });

    box.addEventListener('mouseleave', () => {
      box.style.borderWidth = '2px';
      box.style.zIndex = 100 + index;
      this.hideTooltip();
    });

    // Add click handler
    box.addEventListener('click', () => {
      this.handleVioBoxClick(violation);
    });

    return box;
  }

  showTooltip(event, violation) {
    // Remove existing tooltip
    this.hideTooltip();

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'viobox-tooltip';
    tooltip.className = 'viobox-tooltip';

    // Build tooltip content
    tooltip.innerHTML = `
      <div class="tooltip-header ${violation.severity.toLowerCase()}">
        <span class="severity-badge">${violation.severity}</span>
        <span class="rule-id">${violation.ruleId}</span>
      </div>
      <div class="tooltip-content">
        <div class="violation-type">${violation.violationType.replace(/_/g, ' ')}</div>
        <div class="violation-text">${violation.fullText}</div>
        <div class="tooltip-meta">
          <span>Bureau: ${violation.bureau}</span>
          <span>Page: ${violation.page}</span>
        </div>
      </div>
    `;

    // Position tooltip
    const box = event.target;
    const boxRect = box.getBoundingClientRect();

    tooltip.style.cssText = `
      position: fixed;
      left: ${boxRect.right + 10}px;
      top: ${boxRect.top}px;
      z-index: 10000;
      max-width: 300px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.8);
      color: #fff;
      font-size: 12px;
      line-height: 1.4;
      pointer-events: none;
    `;

    // Add tooltip styles if not already present
    if (!document.getElementById('viobox-tooltip-styles')) {
      const styles = document.createElement('style');
      styles.id = 'viobox-tooltip-styles';
      styles.innerHTML = `
        .viobox-tooltip .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #333;
        }

        .viobox-tooltip .severity-badge {
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          text-transform: uppercase;
        }

        .viobox-tooltip .tooltip-header.extreme .severity-badge {
          background: rgba(220, 38, 38, 0.2);
          color: #ff6666;
        }

        .viobox-tooltip .tooltip-header.severe .severity-badge {
          background: rgba(249, 115, 22, 0.2);
          color: #ff9955;
        }

        .viobox-tooltip .tooltip-header.warning .severity-badge {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .viobox-tooltip .rule-id {
          font-family: monospace;
          font-size: 10px;
          color: #808080;
        }

        .viobox-tooltip .violation-type {
          font-weight: 500;
          margin-bottom: 6px;
          color: #ff6b35;
        }

        .viobox-tooltip .violation-text {
          margin-bottom: 8px;
          color: #b0b0b0;
        }

        .viobox-tooltip .tooltip-meta {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #666;
          padding-top: 8px;
          border-top: 1px solid #333;
        }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(tooltip);

    // Adjust position if tooltip goes off screen
    setTimeout(() => {
      const tooltipRect = tooltip.getBoundingClientRect();
      if (tooltipRect.right > window.innerWidth) {
        tooltip.style.left = `${boxRect.left - tooltipRect.width - 10}px`;
      }
      if (tooltipRect.bottom > window.innerHeight) {
        tooltip.style.top = `${window.innerHeight - tooltipRect.height - 10}px`;
      }
    }, 0);
  }

  hideTooltip() {
    const tooltip = document.getElementById('viobox-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  handleVioBoxClick(violation) {
    console.log('VioBox clicked:', violation);
    // Could open a detailed view, copy to clipboard, etc.

    // Update violation details panel if it exists
    const event = new CustomEvent('viobox-clicked', { detail: violation });
    window.dispatchEvent(event);
  }

  toggleVioBoxes() {
    this.vioboxesVisible = !this.vioboxesVisible;

    // Hide/show all vioboxes
    const vioboxes = document.querySelectorAll('.viobox');
    vioboxes.forEach(box => {
      box.style.display = this.vioboxesVisible ? 'block' : 'none';
    });

    return this.vioboxesVisible;
  }

  updateScale(newScale) {
    this.currentScale = newScale;
    // Vioboxes will be re-rendered with new scale when PDF is rendered
  }

  getStatistics() {
    const stats = {
      total: this.getTotalViolations(),
      byBureau: {},
      bySeverity: {},
      byType: {}
    };

    Object.entries(this.violations).forEach(([bureau, violations]) => {
      stats.byBureau[bureau] = violations.length;

      violations.forEach(v => {
        // Count by severity
        stats.bySeverity[v.severity] = (stats.bySeverity[v.severity] || 0) + 1;

        // Count by type
        stats.byType[v.violationType] = (stats.byType[v.violationType] || 0) + 1;
      });
    });

    return stats;
  }
}

// Export as global for use in main app
window.VioBoxSystem = VioBoxSystem;