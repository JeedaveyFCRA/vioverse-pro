/**
 * Main Application - Exact replica of source HTML functionality
 * 100% data-driven from JSON configurations
 */

(function() {
    'use strict';

    // Ensure namespace exists
    window.VioboxSystem = window.VioboxSystem || {};

    // Configure PDF.js
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    class VioboxViewer {
    constructor() {
        // Global state
        this.config = {};
        this.allCsvData = [];
        this.filteredCsvData = [];
        this.allViolations = {};
        this.pdfFiles = {};
        this.currentPdfIndex = 0;
        this.pdfFileNames = [];
        this.filteredPdfNames = [];
        this.scale = 1.0;
        this.showVioboxes = true;
        this.currentPdfDoc = null;
        this.loadedCsvCount = 0;
        this.bureauCounts = { TU: 0, EX: 0, EQ: 0 };
    }

    async init() {
        try {
            // Load all configurations first
            this.config = await window.VioboxSystem.configLoader.loadAll();
            console.log('Configuration loaded successfully', this.config);

            // Update all UI text from config
            this.updateUIText();

            // Create bureau filters dynamically
            this.createBureauFilters();

            // Create legend dynamically
            this.createLegend();

            // Bind event handlers
            this.bindEventHandlers();

            console.log('VioBox Viewer initialized with data-driven config');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showNotification(this.config.uitext?.messages?.errorLoadingConfig || 'Failed to load configuration', 'error');
        }
    }

    updateUIText() {
        // Update all elements with data-text attributes
        document.querySelectorAll('[data-text]').forEach(element => {
            const path = element.dataset.text;
            const text = this.getConfigText(path);
            if (text) element.textContent = text;
        });

        // Update all elements with data-text-template attributes
        document.querySelectorAll('[data-text-template]').forEach(element => {
            const path = element.dataset.textTemplate;
            const template = this.getConfigText(path);
            if (template) element.dataset.template = template;
        });
    }

    getConfigText(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.config.uitext);
    }

    createBureauFilters() {
        const container = document.querySelector('.bureau-filters');
        if (!container) return;

        container.innerHTML = '';

        // Create filters from bureaus config
        Object.entries(this.config.bureaus.bureaus).forEach(([code, bureau]) => {
            const label = document.createElement('label');
            label.className = 'bureau-checkbox';
            label.innerHTML = `
                <input type="checkbox" id="${bureau.checkboxId}" checked>
                <span>${bureau.shortName}</span>
                <span class="bureau-badge ${bureau.badgeClass}" id="${bureau.countBadgeId}">0</span>
            `;
            container.appendChild(label);
        });
    }

    createLegend() {
        const container = document.getElementById('legend');
        if (!container) return;

        container.innerHTML = '';

        // Create legend from severity config
        Object.entries(this.config.severity.severityLevels).forEach(([level, data]) => {
            if (level === 'unknown') return; // Skip unknown in legend

            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <div class="legend-box" style="background: ${data.fillColor}; border-color: ${data.color};"></div>
                <span>${data.label}</span>
            `;
            container.appendChild(item);
        });
    }

    bindEventHandlers() {
        // CSV upload
        document.getElementById('csvFiles')?.addEventListener('change', (e) => {
            this.handleCsvUpload(e.target.files);
        });

        // PDF upload
        document.getElementById('pdfFiles')?.addEventListener('change', (e) => {
            this.handlePdfUpload(e.target.files);
        });

        // Bureau filters
        Object.values(this.config.bureaus.bureaus).forEach(bureau => {
            document.getElementById(bureau.checkboxId)?.addEventListener('change', () => {
                this.applyBureauFilters();
                if (this.currentPdfDoc) this.displayCurrentPdf();
            });
        });

        // Toggle vioboxes
        document.getElementById('toggleBtn')?.addEventListener('click', () => {
            this.toggleVioboxes();
        });

        // PDF navigation
        document.getElementById('prevBtn')?.addEventListener('click', () => {
            this.previousPDF();
        });

        document.getElementById('nextBtn')?.addEventListener('click', () => {
            this.nextPDF();
        });

        // Zoom controls
        document.querySelectorAll('.zoom-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const scale = parseFloat(btn.dataset.scale);
                this.changeScale(scale);
            });
        });
    }

    async handleCsvUpload(files) {
        const filesArray = Array.from(files);
        this.loadedCsvCount = 0;
        this.allCsvData = [];

        for (const file of filesArray) {
            await this.parseCsvFile(file);
        }

        if (this.loadedCsvCount === filesArray.length) {
            this.processCombinedCsvData();
            document.getElementById('csvCount').textContent = this.loadedCsvCount;

            const message = window.VioboxSystem.configLoader.formatMessage(
                this.config.uitext.messages.successCsvLoad,
                { count: this.loadedCsvCount, violations: this.allCsvData.length }
            );
            this.showNotification(message, 'success');
        }
    }

    parseCsvFile(file) {
        return new Promise((resolve) => {
            Papa.parse(file, {
                header: true,
                complete: (results) => {
                    const validData = results.data.filter(row =>
                        row.violation_type &&
                        row.violation_type !== this.config.uitext.messages.noViolations &&
                        !row.violation_type.startsWith('COMBO_')
                    );

                    // Add bureau info to each row
                    validData.forEach(row => {
                        if (row.pdf_filename) {
                            row.bureau = window.VioboxSystem.configLoader.detectBureauFromFilename(row.pdf_filename);
                        }
                    });

                    this.allCsvData = this.allCsvData.concat(validData);
                    this.loadedCsvCount++;
                    resolve();
                },
                error: (error) => {
                    const errorMsg = window.VioboxSystem.configLoader.formatMessage(
                        this.config.uitext.messages.errorParsingCsv,
                        { error: error.message }
                    );
                    this.showNotification(errorMsg, 'error');
                    resolve();
                }
            });
        });
    }

    async handlePdfUpload(files) {
        const filesArray = Array.from(files);
        let loadedCount = 0;
        this.pdfFiles = {};

        for (const file of filesArray) {
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const typedArray = new Uint8Array(arrayBuffer);

                try {
                    const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
                    this.pdfFiles[file.name] = pdfDoc;
                    loadedCount++;
                    console.log('Loaded PDF:', file.name, 'Bureau:', window.VioboxSystem.configLoader.detectBureauFromFilename(file.name));
                } catch (error) {
                    console.error('Error loading PDF:', file.name, error);
                }
            }
        }

        if (loadedCount > 0) {
            this.pdfFileNames = Object.keys(this.pdfFiles);
            document.getElementById('pdfCount').textContent = loadedCount;
            this.updateBureauCounts();

            const message = window.VioboxSystem.configLoader.formatMessage(
                this.config.uitext.messages.successPdfLoad,
                { count: loadedCount }
            );
            this.showNotification(message, 'success');

            this.enableControls();
            this.applyBureauFilters();

            if (this.filteredPdfNames.length > 0) {
                this.displayFirstPdf();
            }
        }
    }

    updateBureauCounts() {
        this.bureauCounts = { TU: 0, EX: 0, EQ: 0 };
        this.pdfFileNames.forEach(name => {
            const bureau = window.VioboxSystem.configLoader.detectBureauFromFilename(name);
            if (bureau in this.bureauCounts) {
                this.bureauCounts[bureau]++;
            }
        });

        // Update badges
        Object.entries(this.config.bureaus.bureaus).forEach(([code, bureau]) => {
            const badge = document.getElementById(bureau.countBadgeId);
            if (badge) badge.textContent = this.bureauCounts[code] || 0;
        });
    }

    processCombinedCsvData() {
        // Group violations by PDF filename
        this.allViolations = {};
        this.allCsvData.forEach(row => {
            if (row.pdf_filename) {
                if (!this.allViolations[row.pdf_filename]) {
                    this.allViolations[row.pdf_filename] = [];
                }
                this.allViolations[row.pdf_filename].push(row);
            }
        });

        console.log('Processed violations for PDFs:', Object.keys(this.allViolations).length);
        this.updateOverallStats();
        this.checkForMismatches();
    }

    checkForMismatches() {
        const csvPdfNames = new Set(Object.keys(this.allViolations));
        const loadedPdfNames = new Set(this.pdfFileNames);

        const missingCsvForPdfs = this.pdfFileNames.filter(name => !csvPdfNames.has(name));

        if (missingCsvForPdfs.length > 0) {
            const bureaus = [...new Set(missingCsvForPdfs.map(name => window.VioboxSystem.configLoader.detectBureauFromFilename(name)))];
            const warning = `${missingCsvForPdfs.length} PDF(s) loaded without CSV data (${bureaus.join(', ')})`;
            document.getElementById('mismatchText').textContent = warning;
            document.getElementById('mismatchWarning').style.display = 'block';
            this.showNotification(warning + '. Consider loading the corresponding CSV files.', 'warning');
        } else {
            document.getElementById('mismatchWarning').style.display = 'none';
        }
    }

    applyBureauFilters() {
        const filters = {};
        Object.entries(this.config.bureaus.bureaus).forEach(([code, bureau]) => {
            const checkbox = document.getElementById(bureau.checkboxId);
            filters[code] = checkbox ? checkbox.checked : true;
        });

        this.filteredPdfNames = this.pdfFileNames.filter(name => {
            const bureau = window.VioboxSystem.configLoader.detectBureauFromFilename(name);
            return filters[bureau] || false;
        });

        // Update filtered CSV data
        this.filteredCsvData = this.allCsvData.filter(row => {
            const bureau = row.bureau || window.VioboxSystem.configLoader.detectBureauFromFilename(row.pdf_filename || '');
            return filters[bureau] || false;
        });

        this.updateOverallStats();
    }

    enableControls() {
        document.getElementById('toggleBtn').disabled = false;
        document.getElementById('prevBtn').disabled = false;
        document.getElementById('nextBtn').disabled = false;
    }

    async displayFirstPdf() {
        this.currentPdfIndex = 0;
        await this.displayCurrentPdf();
    }

    async displayCurrentPdf() {
        if (this.filteredPdfNames.length === 0) {
            document.getElementById('loading').innerHTML = `
                <div class="loading-icon">⚠️</div>
                <div>${this.config.uitext.messages.noMatchingPdfs}</div>
            `;
            return;
        }

        const pdfName = this.filteredPdfNames[this.currentPdfIndex];
        if (!pdfName || !this.pdfFiles[pdfName]) {
            console.error('PDF not found:', pdfName);
            return;
        }

        this.currentPdfDoc = this.pdfFiles[pdfName];
        const bureau = window.VioboxSystem.configLoader.detectBureauFromFilename(pdfName);

        // Update UI
        document.getElementById('loading').style.display = 'none';
        document.getElementById('pdfCanvas').style.display = 'block';
        document.getElementById('currentPdfName').textContent = pdfName;
        document.getElementById('currentBureau').textContent = bureau;
        document.getElementById('pdfInfo').textContent = `${this.currentPdfIndex + 1} / ${this.filteredPdfNames.length}`;

        // Update navigation buttons
        document.getElementById('prevBtn').disabled = this.currentPdfIndex === 0;
        document.getElementById('nextBtn').disabled = this.currentPdfIndex === this.filteredPdfNames.length - 1;

        // Get violations for this PDF
        const currentViolations = this.getFilteredViolationsForPdf(pdfName);

        const violationText = window.VioboxSystem.configLoader.formatMessage(
            this.config.uitext.labels.violationsOnPage,
            { count: currentViolations.length }
        );
        document.getElementById('currentViolationCount').textContent = violationText;

        // Display violations in sidebar
        this.displayViolationsList(currentViolations);

        // Render PDF
        await this.renderPage(1);
    }

    getFilteredViolationsForPdf(pdfName) {
        return (this.allViolations[pdfName] || []).filter(v => {
            const vBureau = v.bureau || window.VioboxSystem.configLoader.detectBureauFromFilename(v.pdf_filename || '');

            const filters = {};
            Object.entries(this.config.bureaus.bureaus).forEach(([code, bureau]) => {
                const checkbox = document.getElementById(bureau.checkboxId);
                filters[code] = checkbox ? checkbox.checked : true;
            });

            return filters[vBureau] || false;
        });
    }

    async renderPage(pageNum) {
        if (!this.currentPdfDoc) return;

        const page = await this.currentPdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: this.scale });
        const canvas = document.getElementById('pdfCanvas');
        const ctx = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render PDF
        await page.render(renderContext).promise;

        // Draw vioboxes if enabled
        if (this.showVioboxes) {
            const pdfName = this.filteredPdfNames[this.currentPdfIndex];
            const violations = this.getFilteredViolationsForPdf(pdfName);
            this.drawVioboxes(ctx, violations, viewport);
        }
    }

    drawVioboxes(ctx, violations, viewport) {
        violations.forEach(violation => {
            // Skip violations without coordinates
            if (!violation.x || !violation.y || !violation.width || !violation.height) {
                return;
            }

            // Parse coordinates
            const x = parseFloat(violation.x) * this.scale;
            const width = parseFloat(violation.width) * this.scale;
            const height = parseFloat(violation.height) * this.scale;
            const y = parseFloat(violation.y) * this.scale;

            // Get severity configuration
            const severity = window.VioboxSystem.configLoader.getSeverity(violation.severity);

            // Draw filled rectangle
            ctx.fillStyle = severity.fillColor;
            ctx.fillRect(x, y - height, width, height);

            // Draw border
            ctx.strokeStyle = severity.color;
            ctx.lineWidth = severity.borderWidth;
            ctx.strokeRect(x, y - height, width, height);

            // Add label if rule_id exists
            if (violation.rule_id) {
                ctx.fillStyle = severity.color;
                ctx.font = `bold ${11 * this.scale}px Arial`;
                ctx.fillText(violation.rule_id, x + 4, y - height - 4);
            }
        });
    }

    displayViolationsList(violations) {
        const listDiv = document.getElementById('violationList');
        listDiv.innerHTML = '';

        violations.forEach((violation, index) => {
            const severity = window.VioboxSystem.configLoader.getSeverity(violation.severity);
            const bureau = window.VioboxSystem.configLoader.getBureau(violation.bureau || window.VioboxSystem.configLoader.detectBureauFromFilename(violation.pdf_filename || ''));

            const div = document.createElement('div');
            div.className = `violation-item ${severity.itemClass}`;

            let coordsText = '';
            if (violation.x && violation.y) {
                coordsText = `<div class="violation-coords">x:${violation.x} y:${violation.y}</div>`;
            }

            div.innerHTML = `
                <div class="violation-bureau bureau-badge ${bureau.badgeClass}">${bureau.acronym}</div>
                <div class="violation-header">
                    <span class="violation-rule">${violation.rule_id || 'N/A'}</span>
                    <span class="violation-severity ${severity.badgeClass}">${severity.label}</span>
                </div>
                <div class="violation-text">${violation.full_text || violation.violation_type}</div>
                ${coordsText}
            `;
            listDiv.appendChild(div);
        });
    }

    updateOverallStats() {
        const dataToUse = this.filteredCsvData.length > 0 ? this.filteredCsvData : this.allCsvData;

        // Count by severity
        const severityCounts = {};
        Object.keys(this.config.severity.severityLevels).forEach(level => {
            severityCounts[level] = dataToUse.filter(v => (v.severity || '').toLowerCase() === level).length;
        });

        // Update UI
        document.getElementById('totalCount').textContent = dataToUse.length;
        document.getElementById('extremeCount').textContent = severityCounts.extreme || 0;
        document.getElementById('severeCount').textContent = severityCounts.severe || 0;

        // Update bureau breakdown
        const bureauBreakdown = {};
        Object.keys(this.config.bureaus.bureaus).forEach(code => {
            bureauBreakdown[code] = 0;
        });

        dataToUse.forEach(v => {
            const bureau = v.bureau || window.VioboxSystem.configLoader.detectBureauFromFilename(v.pdf_filename || '');
            if (bureau in bureauBreakdown) {
                bureauBreakdown[bureau]++;
            }
        });

        const statsDiv = document.getElementById('bureauStats');
        statsDiv.innerHTML = `<div style="margin-bottom: 5px; font-weight: 600;">${this.config.uitext.labels.bureauBreakdown}:</div>`;

        Object.entries(bureauBreakdown).forEach(([code, count]) => {
            if (count > 0) {
                const bureau = this.config.bureaus.bureaus[code];
                const div = document.createElement('div');
                div.className = 'bureau-stat-item';
                div.innerHTML = `
                    <span>${bureau.shortName}:</span>
                    <span>${count}</span>
                `;
                statsDiv.appendChild(div);
            }
        });
    }

    toggleVioboxes() {
        this.showVioboxes = !this.showVioboxes;
        const btn = document.getElementById('toggleBtn');
        const text = this.showVioboxes ?
            this.config.uitext.buttons.toggleBoxesHide :
            this.config.uitext.buttons.toggleBoxesShow;
        btn.textContent = `👁️ ${text}`;
        this.renderPage(1);
    }

    changeScale(newScale) {
        this.scale = newScale;
        this.renderPage(1);
    }

    async previousPDF() {
        if (this.currentPdfIndex > 0) {
            this.currentPdfIndex--;
            await this.displayCurrentPdf();
        }
    }

    async nextPDF() {
        if (this.currentPdfIndex < this.filteredPdfNames.length - 1) {
            this.currentPdfIndex++;
            await this.displayCurrentPdf();
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 4000);
    }
}

    // Export to global namespace
    window.VioboxSystem.VioboxViewer = VioboxViewer;

    // Initialize app when DOM is ready
    document.addEventListener('DOMContentLoaded', async () => {
        const app = new VioboxViewer();
        await app.init();
        window.VioboxApp = app; // Make app accessible globally for debugging

        // Publish evidence view globally for auto-loader
        window.vioboxApp = window.vioboxApp || {views:{}};
        window.vioboxApp.views.evidence = app;
    });
})();
// Auto-load CSVs and PDFs when asset list is ready
document.addEventListener('DOMContentLoaded', () => {
  const evts = window.APP && APP.events;
  if (!evts) return;

  evts.addEventListener('assets:ready', () => {
    const t = setInterval(async () => {
      const evView = window.vioboxApp?.views?.evidence;
      if (!evView) return;   // wait until views are registered
      clearInterval(t);
      // ▼▼ KEEP your EXISTING CSV/PDF AUTO-INIT CODE between these markers ▼▼
      try {
        const csvUrls = (APP.assets.csv || []).map(a => a.url);
        const pdfUrls = (APP.assets.pdfs || []).map(a => a.url);

        const toFile = async (u, type) =>
          new File([await (await fetch(u)).blob()], u.split('/').pop() || 'file', { type });

        const csvFiles = await Promise.all(csvUrls.map(u => toFile(u, 'text/csv')));
        const pdfFiles = await Promise.all(pdfUrls.map(u => toFile(u, 'application/pdf')));

        if (csvFiles.length) {
          const violations = await evView.csvProcessor.processFiles(csvFiles);
          evView.violations = violations;
          evView.violationsByPDF = evView.csvProcessor.groupByPDF(violations);
          evView.updateStatistics();
        }
        if (pdfFiles.length) {
          const loaded = await evView.pdfManager.loadPDFs(pdfFiles);
          evView.pdfFiles = Object.keys(loaded);
          evView.updateBureauCounts();
        }
        evView.applyFilters();
        if (evView.filteredPdfNames?.length) {
          evView.currentPdfIndex = 0;
          await evView.displayCurrentPDF();
        } else {
          evView.showEmptyState();
        }
        console.log('Auto-init complete from /api/assets');
      } catch (e) {
        console.error('Auto-init failed', e);
      }
      // ▲▲ KEEP your EXISTING CSV/PDF AUTO-INIT CODE between these markers ▲▲
    }, 100);
  }, { once: true });

  // If assets were fetched before listeners attached, re-dispatch the same event
  if (window.APP && APP.assets) {
    evts.dispatchEvent(new Event('assets:ready'));
  }
});
