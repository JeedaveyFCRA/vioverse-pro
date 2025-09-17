/**
 * Main Application Controller
 * Manages views, routing, and core application state
 * Data-driven architecture - no hardcoded values
 */

import { CSVProcessor } from './core/csv-processor.js';
import { PDFManager } from './core/pdf-manager.js';
import { VioboxRenderer } from './core/viobox-renderer.js';
import { EvidenceView } from './views/evidence-view.js';
import { TimelineView } from './views/timeline-view.js';

class VioboxApp {
    constructor() {
        // Core state - all data-driven
        this.currentView = 'evidence';
        this.violations = [];
        this.pdfs = new Map();

        // Initialize core modules
        this.csvProcessor = new CSVProcessor();
        this.pdfManager = new PDFManager();
        this.vioboxRenderer = new VioboxRenderer();

        // Initialize views
        this.views = {
            evidence: new EvidenceView(this),
            timeline: new TimelineView(this)
        };

        // Bind DOM elements
        this.bindElements();
        this.attachEventListeners();

        // Initialize first view
        this.switchView('evidence');
    }

    bindElements() {
        // Navigation
        this.navButtons = document.querySelectorAll('.view-btn');
        this.uploadCSVBtn = document.getElementById('upload-csv');
        this.uploadPDFBtn = document.getElementById('upload-pdf');

        // File inputs
        this.csvInput = document.getElementById('csv-input');
        this.pdfInput = document.getElementById('pdf-input');

        // View container
        this.viewContainer = document.getElementById('view-container');
    }

    attachEventListeners() {
        // View switching
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // File uploads
        this.uploadCSVBtn.addEventListener('click', () => {
            this.csvInput.click();
        });

        this.uploadPDFBtn.addEventListener('click', () => {
            this.pdfInput.click();
        });

        this.csvInput.addEventListener('change', (e) => {
            this.handleCSVUpload(e.target.files[0]);
        });

        this.pdfInput.addEventListener('change', (e) => {
            this.handlePDFUpload(e.target.files);
        });
    }

    async switchView(viewName) {
        // Validate view exists
        if (!this.views[viewName]) {
            console.error(`View ${viewName} not found`);
            return;
        }

        // Update nav buttons
        this.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Hide all view panels
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Show selected view
        const viewPanel = document.getElementById(`${viewName}-view`);
        if (viewPanel) {
            viewPanel.classList.add('active');
        }

        // Update app state
        this.currentView = viewName;
        document.getElementById('app').dataset.view = viewName;

        // Load view-specific CSS if needed
        await this.loadViewCSS(viewName);

        // Render view
        this.views[viewName].render();
    }

    async loadViewCSS(viewName) {
        // Check if CSS already loaded
        const cssId = `${viewName}-view-css`;
        if (document.getElementById(cssId)) return;

        // Check if CSS file exists
        const cssPath = `css/views/${viewName}.css`;
        try {
            const response = await fetch(cssPath, { method: 'HEAD' });
            if (response.ok) {
                // Load CSS dynamically
                const link = document.createElement('link');
                link.id = cssId;
                link.rel = 'stylesheet';
                link.href = cssPath;
                document.head.appendChild(link);
            }
        } catch (error) {
            // CSS file doesn't exist yet - that's okay
            console.log(`No view-specific CSS for ${viewName} yet`);
        }
    }

    async handleCSVUpload(file) {
        if (!file) return;

        try {
            // Process CSV - returns array of violation objects
            const violations = await this.csvProcessor.processFile(file);

            // Filter out non-violations
            this.violations = violations.filter(v =>
                v.violation_type !== 'No Violations Found' &&
                !v.violation_type.startsWith('COMBO')
            );

            console.log(`Loaded ${this.violations.length} violations from CSV`);

            // Update views with new data
            this.updateAllViews();

        } catch (error) {
            console.error('Error processing CSV:', error);
            alert('Error processing CSV file. Check console for details.');
        }
    }

    async handlePDFUpload(files) {
        if (!files || files.length === 0) return;

        for (const file of files) {
            try {
                // Store PDF reference
                this.pdfs.set(file.name, file);
                console.log(`Loaded PDF: ${file.name}`);

                // If this PDF has violations, render them
                const pdfViolations = this.violations.filter(v =>
                    v.pdf_filename === file.name
                );

                if (pdfViolations.length > 0) {
                    // Update current view
                    this.views[this.currentView].handlePDFLoaded(file.name);
                }

            } catch (error) {
                console.error(`Error loading PDF ${file.name}:`, error);
            }
        }
    }

    updateAllViews() {
        // Update all views with new violation data
        Object.values(this.views).forEach(view => {
            view.updateData(this.violations);
        });
    }

    getViolationsByPDF(pdfFilename) {
        return this.violations.filter(v => v.pdf_filename === pdfFilename);
    }

    getViolationsBySeverity(severity) {
        return this.violations.filter(v =>
            v.severity.toLowerCase() === severity.toLowerCase()
        );
    }

    getViolationStats() {
        const stats = {
            extreme: 0,
            severe: 0,
            serious: 0,
            minor: 0,
            total: 0
        };

        this.violations.forEach(v => {
            const severity = v.severity.toLowerCase();
            if (stats.hasOwnProperty(severity)) {
                stats[severity]++;
            }
            stats.total++;
        });

        return stats;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.vioboxApp = new VioboxApp();
    console.log('Viobox System v2.0 initialized - Data-driven architecture ready');
});