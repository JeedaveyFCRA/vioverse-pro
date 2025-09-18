/**
 * Main Application Entry Point - Mobile Optimized Version
 * Orchestrates all components with mobile-first approach
 */

import { ConfigLoader } from './core/config-loader.js';
import { CSVProcessor } from './core/csv-processor.js';
import { PDFManagerMobile } from './core/pdf-manager-mobile.js';
import { VioBoxRenderer } from './core/viobox-renderer.js';
import { TouchHandler } from './core/touch-handler.js';

class VioBoxApp {
    constructor() {
        this.config = null;
        this.csvProcessor = null;
        this.pdfManager = null;
        this.vioBoxRenderer = null;
        this.touchHandler = null;

        // State
        this.currentViolations = [];
        this.filteredViolations = [];
        this.activeFilters = {
            TU: true,
            EX: true,
            EQ: true
        };

        // Device detection
        this.isMobile = this.detectMobile();
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.isAndroid = /Android/.test(navigator.userAgent);

        // Performance monitoring
        this.performanceMetrics = {
            appStartTime: Date.now(),
            pdfLoadTimes: [],
            memorySnapshots: []
        };
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            // Show loading state
            this.showLoadingState('Initializing application...');

            // Load configuration
            await this.loadConfiguration();

            // Initialize components
            await this.initializeComponents();

            // Set up event listeners
            this.setupEventListeners();

            // Apply mobile optimizations
            if (this.isMobile) {
                this.applyMobileOptimizations();
            }

            // Initialize UI
            this.initializeUI();

            // Start performance monitoring
            this.startPerformanceMonitoring();

            // Hide loading state
            this.hideLoadingState();

            // Log initialization time
            const initTime = Date.now() - this.performanceMetrics.appStartTime;
            console.log(`App initialized in ${initTime}ms`);

        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application. Please refresh.');
        }
    }

    /**
     * Detect mobile device
     */
    detectMobile() {
        return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
               window.innerWidth < 768;
    }

    /**
     * Load configuration
     */
    async loadConfiguration() {
        const configLoader = new ConfigLoader();
        this.config = await configLoader.loadAll();

        // Apply theme
        configLoader.applyTheme(this.config.theme);

        // Update UI text
        this.updateUIText(this.config.uiText);
    }

    /**
     * Initialize components
     */
    async initializeComponents() {
        // CSV Processor
        this.csvProcessor = new CSVProcessor(this.config);

        // PDF Manager with mobile optimizations
        const memoryLimit = this.isMobile ? 50 : 200; // MB
        const chunkSize = this.isMobile ? 3 : 10;

        this.pdfManager = new PDFManagerMobile({
            ...this.config,
            maxMemoryMB: memoryLimit,
            chunkSize: chunkSize,
            onLoadStart: this.onPDFLoadStart.bind(this),
            onLoadComplete: this.onPDFLoadComplete.bind(this),
            onLoadError: this.onPDFLoadError.bind(this),
            onRenderError: this.onPDFRenderError.bind(this)
        });

        // Set canvas
        const canvas = document.getElementById('pdfCanvas');
        this.pdfManager.setCanvas(canvas);

        // VioBox Renderer
        this.vioBoxRenderer = new VioBoxRenderer(this.config);

        // Touch Handler for mobile
        if (this.isMobile || this.config.features.enableTouchOnDesktop) {
            this.touchHandler = new TouchHandler(canvas, {
                initialScale: 1.0,
                minScale: 0.5,
                maxScale: 3.0,
                enableMouseEmulation: !this.isMobile,
                onZoom: this.onZoom.bind(this),
                onSwipe: this.onSwipe.bind(this)
            });
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // CSV upload
        const csvInput = document.getElementById('csvFiles');
        if (csvInput) {
            csvInput.addEventListener('change', this.handleCSVUpload.bind(this));
        }

        // PDF upload
        const pdfInput = document.getElementById('pdfFiles');
        if (pdfInput) {
            pdfInput.addEventListener('change', this.handlePDFUpload.bind(this));
        }

        // Navigation
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        if (prevBtn) prevBtn.addEventListener('click', this.previousPDF.bind(this));
        if (nextBtn) nextBtn.addEventListener('click', this.nextPDF.bind(this));

        // Toggle violations
        const toggleBtn = document.getElementById('toggleBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.toggleViolations.bind(this));
        }

        // Zoom controls
        document.querySelectorAll('.zoom-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const scale = parseFloat(btn.dataset.scale);
                this.setZoom(scale);
            });
        });

        // Bureau filters
        this.setupBureauFilters();

        // Window events
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));

        // Memory pressure events
        if ('memory' in performance) {
            window.addEventListener('memorywarning', this.handleMemoryWarning.bind(this));
        }

        // Page visibility
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

        // Cleanup on unload
        window.addEventListener('beforeunload', this.cleanup.bind(this));
    }

    /**
     * Apply mobile-specific optimizations
     */
    applyMobileOptimizations() {
        // Add mobile class to body
        document.body.classList.add('is-mobile');

        if (this.isIOS) {
            document.body.classList.add('is-ios');
        }

        if (this.isAndroid) {
            document.body.classList.add('is-android');
        }

        // Disable right-click on mobile
        document.addEventListener('contextmenu', (e) => {
            if (this.isMobile) e.preventDefault();
        });

        // Prevent zoom on input focus (iOS)
        if (this.isIOS) {
            const inputs = document.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.style.fontSize = '16px';
            });
        }

        // Add mobile viewport height fix
        this.setMobileViewportHeight();
        window.addEventListener('resize', this.setMobileViewportHeight.bind(this));
    }

    /**
     * Set correct viewport height on mobile
     */
    setMobileViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    /**
     * Handle CSV upload
     */
    async handleCSVUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        this.showLoadingState(`Processing ${files.length} CSV file(s)...`);

        try {
            const results = await this.csvProcessor.processMultiple(files);

            this.currentViolations = results.violations;
            this.applyFilters();

            // Update UI
            document.getElementById('csvCount').textContent = results.processed;
            this.updateViolationsList();
            this.updateStats();

            this.showNotification(`Loaded ${results.processed} CSV files with ${results.violations.length} violations`, 'success');

        } catch (error) {
            console.error('CSV processing error:', error);
            this.showError('Failed to process CSV files');
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Handle PDF upload with progressive loading
     */
    async handlePDFUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        // Show loading UI
        const loadingEl = document.getElementById('pdfLoading');
        if (loadingEl) {
            loadingEl.style.display = 'flex';
            document.getElementById('totalCount').textContent = files.length;
        }

        try {
            // Start progressive loading
            const results = await this.pdfManager.loadPDFsProgressive(files);

            // Update count
            document.getElementById('pdfCount').textContent = this.pdfManager.pdfMetadata.size;

            // Display first PDF
            if (this.pdfManager.pdfMetadata.size > 0) {
                const firstPdf = Array.from(this.pdfManager.pdfMetadata.keys())[0];
                await this.displayPDF(firstPdf);
            }

            // Enable controls
            this.enableControls();

            this.showNotification(`Loading ${files.length} PDFs progressively...`, 'info');

        } catch (error) {
            console.error('PDF loading error:', error);
            this.showError('Failed to load PDF files');
        }
    }

    /**
     * Display PDF
     */
    async displayPDF(filename) {
        const canvas = document.getElementById('pdfCanvas');
        const loading = document.getElementById('loading');

        try {
            await this.pdfManager.displayPDF(filename);

            // Show canvas, hide loading
            canvas.style.display = 'block';
            if (loading) loading.style.display = 'none';

            // Update UI
            this.updatePDFInfo();

            // Draw violations
            if (this.vioBoxRenderer && this.showViolations) {
                await this.drawViolations();
            }

        } catch (error) {
            console.error('Display PDF error:', error);
            this.showError(`Failed to display PDF: ${filename}`);
        }
    }

    /**
     * Navigate to previous PDF
     */
    async previousPDF() {
        const pdfs = Array.from(this.pdfManager.pdfMetadata.keys());
        const currentIndex = pdfs.indexOf(this.pdfManager.currentPdfName);

        if (currentIndex > 0) {
            await this.displayPDF(pdfs[currentIndex - 1]);
        }
    }

    /**
     * Navigate to next PDF
     */
    async nextPDF() {
        const pdfs = Array.from(this.pdfManager.pdfMetadata.keys());
        const currentIndex = pdfs.indexOf(this.pdfManager.currentPdfName);

        if (currentIndex < pdfs.length - 1) {
            await this.displayPDF(pdfs[currentIndex + 1]);
        }
    }

    /**
     * Handle zoom change
     */
    onZoom(scale) {
        this.pdfManager.scale = scale;
        this.pdfManager.renderPage(this.pdfManager.currentPage);
    }

    /**
     * Handle swipe gesture
     */
    onSwipe(direction) {
        if (direction === 'left') {
            this.nextPDF();
        } else if (direction === 'right') {
            this.previousPDF();
        }
    }

    /**
     * Handle memory warning
     */
    handleMemoryWarning() {
        console.warn('Memory warning received');
        this.pdfManager.freeMemory();
        this.showNotification('Low memory detected. Freeing resources...', 'warning');
    }

    /**
     * Handle visibility change (tab switching)
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, pause background tasks
            if (this.pdfManager) {
                this.pdfManager.isLoading = false;
            }
        } else {
            // Page is visible, resume tasks
            if (this.pdfManager && this.pdfManager.loadQueue.length > 0) {
                this.pdfManager.processLoadQueue();
            }
        }
    }

    /**
     * Performance monitoring
     */
    startPerformanceMonitoring() {
        // Memory monitoring
        if (performance.memory) {
            setInterval(() => {
                const used = performance.memory.usedJSHeapSize / (1024 * 1024);
                const limit = performance.memory.jsHeapSizeLimit / (1024 * 1024);
                const percentage = (used / limit) * 100;

                document.getElementById('memoryUsage').textContent = `${used.toFixed(1)}MB`;

                if (percentage > 80) {
                    this.handleMemoryWarning();
                }

                // Record snapshot
                this.performanceMetrics.memorySnapshots.push({
                    timestamp: Date.now(),
                    used: used,
                    percentage: percentage
                });

            }, 5000);
        }

        // FPS monitoring (optional)
        if (this.config.features.showFPS) {
            this.startFPSMonitoring();
        }
    }

    /**
     * Update violation list with virtualization for mobile
     */
    updateViolationsList() {
        const list = document.getElementById('violationList');
        if (!list) return;

        list.innerHTML = '';

        // Limit violations shown on mobile
        const maxItems = this.isMobile ? 50 : 200;
        const violations = this.filteredViolations.slice(0, maxItems);

        violations.forEach(violation => {
            const item = this.createViolationItem(violation);
            list.appendChild(item);
        });

        // Show "Load More" button if needed
        if (this.filteredViolations.length > maxItems) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.textContent = `Show ${this.filteredViolations.length - maxItems} more...`;
            loadMoreBtn.addEventListener('click', () => {
                this.showAllViolations();
            });
            list.appendChild(loadMoreBtn);
        }

        // Update count
        document.getElementById('currentViolationCount').textContent =
            `${this.filteredViolations.length} violations`;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.pdfManager) {
            this.pdfManager.destroy();
        }

        if (this.touchHandler) {
            this.touchHandler.destroy();
        }

        // Clear intervals
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
        }
    }

    // ... Additional helper methods ...

    showLoadingState(message) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'flex';
            loading.querySelector('div:last-child').textContent = message || 'Loading...';
        }
    }

    hideLoadingState() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'block';

            setTimeout(() => {
                notification.style.display = 'none';
            }, 4000);
        }
    }

    showError(message) {
        const errorEl = document.getElementById('pdfError');
        if (errorEl) {
            document.getElementById('errorMessage').textContent = message;
            errorEl.style.display = 'block';

            setTimeout(() => {
                errorEl.style.display = 'none';
            }, 5000);
        } else {
            this.showNotification(message, 'error');
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.vioBoxApp = new VioBoxApp();
        window.vioBoxApp.init();
    });
} else {
    window.vioBoxApp = new VioBoxApp();
    window.vioBoxApp.init();
}

// Export for use in other modules
export default VioBoxApp;