/**
 * EvidenceView - View controller for Evidence/Viobox display
 * Manages PDF display, violation rendering, and user interactions
 */

import { CSVProcessor } from '../core/csv-processor.js';
import { PDFManager } from '../core/pdf-manager.js';
import { VioboxRenderer } from '../core/viobox-renderer.js';

export class EvidenceView {
    constructor(app) {
        this.app = app;
        this.violations = [];
        this.filteredViolations = [];
        this.currentPdfIndex = 0;
        this.pdfFiles = [];
        this.activeFilters = {
            bureaus: ['TU', 'EX', 'EQ'],
            severities: ['extreme', 'severe', 'serious', 'minor']
        };

        // Initialize core modules with config
        this.csvProcessor = new CSVProcessor(app.config.bureaus);
        this.pdfManager = new PDFManager(app.config.defaults.viewport);
        this.vioboxRenderer = new VioboxRenderer(
            app.config.severity,
            app.config.defaults.canvas
        );

        // Bind DOM elements
        this.bindElements();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        // Canvas
        this.canvas = document.getElementById('pdfCanvas');
        this.pdfManager.setCanvas(this.canvas);

        // File inputs
        this.csvInput = document.getElementById('csv-input');
        this.pdfInput = document.getElementById('pdf-input');

        // Controls
        this.toggleBtn = document.getElementById('toggleBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');

        // Info displays
        this.pdfInfo = document.getElementById('pdfInfo');
        this.currentPdfName = document.getElementById('currentPdfName');
        this.violationCount = document.getElementById('currentViolationCount');

        // Violation list
        this.violationList = document.getElementById('violationList');

        // Statistics
        this.totalCount = document.getElementById('totalCount');
        this.extremeCount = document.getElementById('extremeCount');
        this.severeCount = document.getElementById('severeCount');

        // Bureau filters
        this.bureauFilters = {
            TU: document.getElementById('filterTU'),
            EX: document.getElementById('filterEX'),
            EQ: document.getElementById('filterEQ')
        };

        // Bureau badges
        this.bureauBadges = {
            TU: document.getElementById('badgeTU'),
            EX: document.getElementById('badgeEX'),
            EQ: document.getElementById('badgeEQ')
        };
    }

    /**
     * Initialize view
     */
    async initialize() {
        // Load configurations
        await this.loadConfigurations();

        // Attach event listeners
        this.attachEventListeners();

        // Apply default filters
        this.updateActiveFilters();

        // Initial render
        this.render();
    }

    /**
     * Load configuration files
     */
    async loadConfigurations() {
        // Configurations are already loaded in app
        // Just apply defaults
        const defaults = this.app.config.defaults;

        this.vioboxRenderer.setVisibility(defaults.display.showVioboxesOnLoad);
        this.pdfManager.scale = defaults.viewport.initialScale;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // File uploads
        if (this.csvInput) {
            this.csvInput.addEventListener('change', (e) => this.handleCSVUpload(e));
        }

        if (this.pdfInput) {
            this.pdfInput.addEventListener('change', (e) => this.handlePDFUpload(e));
        }

        // Navigation
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.previousPDF());
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextPDF());
        }

        // Toggle vioboxes
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggleVioboxes());
        }

        // Bureau filters
        Object.entries(this.bureauFilters).forEach(([bureau, checkbox]) => {
            if (checkbox) {
                checkbox.addEventListener('change', () => this.updateBureauFilter());
            }
        });

        // Canvas interactions
        if (this.canvas) {
            this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
            this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        }

        // Violation list items
        if (this.violationList) {
            this.violationList.addEventListener('click', (e) => {
                if (e.target.closest('.violation-item')) {
                    this.handleViolationClick(e.target.closest('.violation-item'));
                }
            });
        }
    }

    /**
     * Handle CSV file upload
     * @param {Event} event - File input event
     */
    async handleCSVUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        try {
            // Process CSV files
            const violations = await this.csvProcessor.processFiles(files);
            this.violations = violations;

            // Group by PDF
            this.violationsByPDF = this.csvProcessor.groupByPDF(violations);

            // Update statistics
            this.updateStatistics();

            // Apply filters
            this.applyFilters();

            // Show success message
            this.app.showNotification(
                `Loaded ${files.length} CSV file(s) with ${violations.length} violations`,
                'success'
            );

        } catch (error) {
            console.error('Error processing CSV:', error);
            this.app.showNotification('Error processing CSV files', 'error');
        }
    }

    /**
     * Handle PDF file upload
     * @param {Event} event - File input event
     */
    async handlePDFUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        try {
            // Load PDF files
            const loadedPdfs = await this.pdfManager.loadPDFs(files);
            this.pdfFiles = Object.keys(loadedPdfs);

            // Update bureau counts
            this.updateBureauCounts();

            // Apply filters to get filtered PDF list
            this.applyFilters();

            // Display first PDF if available
            if (this.filteredPdfNames.length > 0) {
                this.currentPdfIndex = 0;
                await this.displayCurrentPDF();
            }

            // Show success message
            this.app.showNotification(
                `Loaded ${this.pdfFiles.length} PDF file(s)`,
                'success'
            );

        } catch (error) {
            console.error('Error loading PDFs:', error);
            this.app.showNotification('Error loading PDF files', 'error');
        }
    }

    /**
     * Display current PDF with violations
     */
    async displayCurrentPDF() {
        if (!this.filteredPdfNames || this.filteredPdfNames.length === 0) {
            this.showEmptyState();
            return;
        }

        const pdfName = this.filteredPdfNames[this.currentPdfIndex];

        // Set current PDF
        if (!this.pdfManager.setCurrentPDF(pdfName)) {
            console.error('Failed to set current PDF:', pdfName);
            return;
        }

        try {
            // Render PDF page
            const renderResult = await this.pdfManager.renderPage(1);

            // Get violations for this PDF
            const pdfViolations = this.getViolationsForPDF(pdfName);

            // Draw vioboxes
            if (this.vioboxRenderer.visible) {
                const ctx = this.canvas.getContext('2d');
                this.vioboxRenderer.draw(
                    ctx,
                    pdfViolations,
                    renderResult.viewport,
                    renderResult.scale,
                    { page: 1 }
                );
            }

            // Update UI
            this.updatePDFInfo(pdfName, pdfViolations);
            this.displayViolationsList(pdfViolations);

        } catch (error) {
            console.error('Error displaying PDF:', error);
            this.app.showNotification('Error displaying PDF', 'error');
        }
    }

    /**
     * Get filtered violations for specific PDF
     * @param {String} pdfName - PDF filename
     * @returns {Array} Filtered violations
     */
    getViolationsForPDF(pdfName) {
        const violations = this.violationsByPDF[pdfName] || [];

        return violations.filter(v => {
            // Apply bureau filter
            if (!this.activeFilters.bureaus.includes(v.bureau)) {
                return false;
            }

            // Apply severity filter
            if (!this.activeFilters.severities.includes(v.severity)) {
                return false;
            }

            return true;
        });
    }

    /**
     * Update PDF info display
     * @param {String} pdfName - PDF filename
     * @param {Array} violations - Violations for this PDF
     */
    updatePDFInfo(pdfName, violations) {
        if (this.currentPdfName) {
            this.currentPdfName.textContent = pdfName;
        }

        if (this.violationCount) {
            this.violationCount.textContent = `${violations.length} violations on this page`;
        }

        if (this.pdfInfo) {
            this.pdfInfo.textContent = `${this.currentPdfIndex + 1} / ${this.filteredPdfNames.length}`;
        }

        // Update navigation buttons
        if (this.prevBtn) {
            this.prevBtn.disabled = this.currentPdfIndex === 0;
        }

        if (this.nextBtn) {
            this.nextBtn.disabled = this.currentPdfIndex === this.filteredPdfNames.length - 1;
        }
    }

    /**
     * Display violations in sidebar list
     * @param {Array} violations - Violations to display
     */
    displayViolationsList(violations) {
        if (!this.violationList) return;

        this.violationList.innerHTML = '';

        violations.forEach(violation => {
            const item = this.createViolationItem(violation);
            this.violationList.appendChild(item);
        });
    }

    /**
     * Create violation list item element
     * @param {Object} violation - Violation data
     * @returns {HTMLElement} Violation item element
     */
    createViolationItem(violation) {
        const div = document.createElement('div');
        const severity = violation.severity || 'unknown';
        const bureau = violation.bureau || 'UNKNOWN';

        div.className = `violation-item ${severity}`;
        div.dataset.ruleId = violation.rule_id;

        // Get bureau config
        const bureauConfig = this.app.config.bureaus.bureaus[bureau] ||
            this.app.config.bureaus.unknownBureau;

        // Get severity config
        const severityConfig = this.app.config.severity.severityLevels[severity];

        // Build HTML
        div.innerHTML = `
            <div class="violation-bureau bureau-badge ${bureauConfig.badgeClass}">${bureau}</div>
            <div class="violation-header">
                <span class="violation-rule">${violation.rule_id || 'N/A'}</span>
                <span class="violation-severity ${severityConfig.badgeClass}">${severityConfig.label}</span>
            </div>
            <div class="violation-text">${violation.full_text || violation.violation_type}</div>
            ${violation.hasCoordinates ?
                `<div class="violation-coords">x:${violation.x.toFixed(1)} y:${violation.y.toFixed(1)}</div>` :
                ''
            }
        `;

        return div;
    }

    /**
     * Navigate to previous PDF
     */
    async previousPDF() {
        if (this.currentPdfIndex > 0) {
            this.currentPdfIndex--;
            await this.displayCurrentPDF();
        }
    }

    /**
     * Navigate to next PDF
     */
    async nextPDF() {
        if (this.currentPdfIndex < this.filteredPdfNames.length - 1) {
            this.currentPdfIndex++;
            await this.displayCurrentPDF();
        }
    }

    /**
     * Toggle viobox visibility
     */
    toggleVioboxes() {
        const visible = this.vioboxRenderer.toggleVisibility();

        if (this.toggleBtn) {
            const uiText = this.app.config.uiText;
            this.toggleBtn.textContent = visible ?
                uiText.buttons.toggleBoxesHide :
                uiText.buttons.toggleBoxesShow;
        }

        // Re-render current PDF
        this.displayCurrentPDF();
    }

    /**
     * Update active filters based on UI state
     */
    updateActiveFilters() {
        // Update bureau filters
        this.activeFilters.bureaus = [];
        Object.entries(this.bureauFilters).forEach(([bureau, checkbox]) => {
            if (checkbox && checkbox.checked) {
                this.activeFilters.bureaus.push(bureau);
            }
        });

        // Apply filters and re-render
        this.applyFilters();
    }

    /**
     * Apply filters to violations and PDFs
     */
    applyFilters() {
        // Filter PDFs by bureau
        this.filteredPdfNames = this.pdfFiles.filter(name => {
            const bureau = this.csvProcessor.detectBureau(name);
            return this.activeFilters.bureaus.includes(bureau);
        });

        // Filter violations
        this.filteredViolations = this.violations.filter(v => {
            return this.activeFilters.bureaus.includes(v.bureau) &&
                this.activeFilters.severities.includes(v.severity);
        });

        // Update statistics
        this.updateStatistics();

        // Re-render if PDF is displayed
        if (this.pdfManager.getCurrentInfo().loaded) {
            this.displayCurrentPDF();
        }
    }

    /**
     * Update bureau filter
     */
    updateBureauFilter() {
        this.updateActiveFilters();
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        const stats = this.csvProcessor.getStatistics(this.filteredViolations);

        // Update total count
        if (this.totalCount) {
            this.totalCount.textContent = stats.total;
        }

        // Update severity counts
        if (this.extremeCount) {
            this.extremeCount.textContent = stats.bySeverity.extreme || 0;
        }

        if (this.severeCount) {
            this.severeCount.textContent = stats.bySeverity.severe || 0;
        }

        // Update bureau badges
        Object.entries(this.bureauBadges).forEach(([bureau, badge]) => {
            if (badge) {
                badge.textContent = stats.byBureau[bureau] || 0;
            }
        });
    }

    /**
     * Update bureau counts for loaded PDFs
     */
    updateBureauCounts() {
        const counts = { TU: 0, EX: 0, EQ: 0 };

        this.pdfFiles.forEach(name => {
            const bureau = this.csvProcessor.detectBureau(name);
            if (bureau in counts) {
                counts[bureau]++;
            }
        });

        // Update display
        Object.entries(counts).forEach(([bureau, count]) => {
            const badge = document.getElementById(`badge${bureau}`);
            if (badge) {
                badge.textContent = count;
            }
        });
    }

    /**
     * Handle canvas click
     * @param {MouseEvent} event - Click event
     */
    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const pdfName = this.filteredPdfNames[this.currentPdfIndex];
        const violations = this.getViolationsForPDF(pdfName);

        const clicked = this.vioboxRenderer.getViolationAtPoint(
            x, y, violations, this.pdfManager.scale
        );

        if (clicked) {
            this.vioboxRenderer.toggleSelection(clicked.rule_id);
            this.displayCurrentPDF();
        }
    }

    /**
     * Handle canvas hover
     * @param {MouseEvent} event - Mouse move event
     */
    handleCanvasHover(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const pdfName = this.filteredPdfNames[this.currentPdfIndex];
        const violations = this.getViolationsForPDF(pdfName);

        const hovered = this.vioboxRenderer.getViolationAtPoint(
            x, y, violations, this.pdfManager.scale
        );

        if (hovered) {
            this.vioboxRenderer.setHovered(hovered.rule_id);
            this.canvas.style.cursor = 'pointer';
        } else {
            this.vioboxRenderer.clearHover();
            this.canvas.style.cursor = 'default';
        }
    }

    /**
     * Handle violation list item click
     * @param {HTMLElement} item - Clicked item
     */
    handleViolationClick(item) {
        const ruleId = item.dataset.ruleId;
        if (ruleId) {
            this.vioboxRenderer.toggleSelection(ruleId);
            this.displayCurrentPDF();
        }
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Show loading message
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    /**
     * Render view
     */
    render() {
        // Initial render logic
        console.log('Evidence View rendered');
    }

    /**
     * Update with new data
     * @param {Array} violations - New violation data
     */
    updateData(violations) {
        this.violations = violations;
        this.violationsByPDF = this.csvProcessor.groupByPDF(violations);
        this.applyFilters();
    }

    /**
     * Handle PDF loaded event
     * @param {String} pdfName - Loaded PDF name
     */
    handlePDFLoaded(pdfName) {
        // Check if this PDF has violations
        const violations = this.violationsByPDF[pdfName];
        if (violations && violations.length > 0) {
            // Switch to this PDF
            const index = this.filteredPdfNames.indexOf(pdfName);
            if (index !== -1) {
                this.currentPdfIndex = index;
                this.displayCurrentPDF();
            }
        }
    }

    /**
     * Clean up view
     */
    destroy() {
        // Remove event listeners
        // Clear canvas
        // Reset state
    }
}