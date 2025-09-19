/**
 * PDFManager - Handles PDF loading, rendering, and page management
 * Uses PDF.js library for PDF processing
 */

(function() {
    'use strict';

    // Ensure namespace exists
    window.VioboxSystem = window.VioboxSystem || {};

    class PDFManager {
    constructor(config = {}) {
        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = config.workerSrc ||
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        this.pdfs = new Map();
        this.currentPdf = null;
        this.currentPage = 1;
        this.scale = config.initialScale || 1.0;
        this.canvas = null;
        this.ctx = null;
        this.config = config;
    }

    /**
     * Initialize canvas element
     * @param {HTMLCanvasElement} canvas - Canvas element for rendering
     */
    setCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    /**
     * Load multiple PDF files
     * @param {FileList} files - PDF files to load
     * @returns {Promise<Object>} Loaded PDF documents map
     */
    async loadPDFs(files) {
        const loadPromises = [];

        for (const file of files) {
            if (file.type === 'application/pdf') {
                loadPromises.push(this.loadPDF(file));
            }
        }

        const results = await Promise.all(loadPromises);

        // Build success map
        const loadedPdfs = {};
        results.forEach(result => {
            if (result.success) {
                loadedPdfs[result.filename] = result.pdfDoc;
            }
        });

        return loadedPdfs;
    }

    /**
     * Load single PDF file
     * @param {File} file - PDF file to load
     * @returns {Promise<Object>} Load result
     */
    async loadPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const typedArray = new Uint8Array(arrayBuffer);

            const loadingTask = pdfjsLib.getDocument({
                data: typedArray,
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true
            });

            const pdfDoc = await loadingTask.promise;

            // Store PDF document
            this.pdfs.set(file.name, pdfDoc);

            return {
                success: true,
                filename: file.name,
                pdfDoc: pdfDoc,
                numPages: pdfDoc.numPages
            };
        } catch (error) {
            console.error(`Error loading PDF ${file.name}:`, error);
            return {
                success: false,
                filename: file.name,
                error: error.message
            };
        }
    }

    /**
     * Get PDF document by filename
     * @param {String} filename - PDF filename
     * @returns {Object} PDF document or null
     */
    getPDF(filename) {
        return this.pdfs.get(filename);
    }

    /**
     * Set current PDF for rendering
     * @param {String} filename - PDF filename to set as current
     * @returns {Boolean} Success status
     */
    setCurrentPDF(filename) {
        const pdfDoc = this.pdfs.get(filename);
        if (pdfDoc) {
            this.currentPdf = pdfDoc;
            this.currentPage = 1;
            return true;
        }
        return false;
    }

    /**
     * Render specific page of current PDF
     * @param {Number} pageNum - Page number to render
     * @param {Object} options - Rendering options
     * @returns {Promise<Object>} Render result with viewport info
     */
    async renderPage(pageNum = 1, options = {}) {
        if (!this.currentPdf || !this.canvas) {
            throw new Error('No PDF or canvas set');
        }

        // Validate page number
        if (pageNum < 1 || pageNum > this.currentPdf.numPages) {
            throw new Error(`Invalid page number: ${pageNum}`);
        }

        try {
            const page = await this.currentPdf.getPage(pageNum);

            // Calculate viewport with scale
            const scale = options.scale || this.scale;
            const viewport = page.getViewport({ scale });

            // Prepare canvas
            this.canvas.height = viewport.height;
            this.canvas.width = viewport.width;

            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Render context
            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport,
                background: options.background || 'white'
            };

            // Render page
            const renderTask = page.render(renderContext);
            await renderTask.promise;

            this.currentPage = pageNum;

            return {
                success: true,
                pageNum: pageNum,
                viewport: viewport,
                scale: scale,
                width: viewport.width,
                height: viewport.height
            };
        } catch (error) {
            console.error(`Error rendering page ${pageNum}:`, error);
            throw error;
        }
    }

    /**
     * Navigate to next page
     * @returns {Promise<Object>} Render result
     */
    async nextPage() {
        if (!this.currentPdf) return null;

        const nextPage = Math.min(this.currentPage + 1, this.currentPdf.numPages);
        if (nextPage !== this.currentPage) {
            return await this.renderPage(nextPage);
        }
        return null;
    }

    /**
     * Navigate to previous page
     * @returns {Promise<Object>} Render result
     */
    async previousPage() {
        if (!this.currentPdf) return null;

        const prevPage = Math.max(this.currentPage - 1, 1);
        if (prevPage !== this.currentPage) {
            return await this.renderPage(prevPage);
        }
        return null;
    }

    /**
     * Change zoom level
     * @param {Number} scale - New scale factor
     * @returns {Promise<Object>} Render result
     */
    async setScale(scale) {
        // Validate scale
        const minScale = this.config.minScale || 0.5;
        const maxScale = this.config.maxScale || 3.0;

        scale = Math.max(minScale, Math.min(maxScale, scale));
        this.scale = scale;

        // Re-render current page with new scale
        if (this.currentPdf) {
            return await this.renderPage(this.currentPage, { scale });
        }
        return null;
    }

    /**
     * Zoom in
     * @returns {Promise<Object>} Render result
     */
    async zoomIn() {
        const step = this.config.scaleStep || 0.25;
        return await this.setScale(this.scale + step);
    }

    /**
     * Zoom out
     * @returns {Promise<Object>} Render result
     */
    async zoomOut() {
        const step = this.config.scaleStep || 0.25;
        return await this.setScale(this.scale - step);
    }

    /**
     * Fit page to width
     * @param {Number} containerWidth - Container width
     * @returns {Promise<Object>} Render result
     */
    async fitToWidth(containerWidth) {
        if (!this.currentPdf) return null;

        const page = await this.currentPdf.getPage(this.currentPage);
        const viewport = page.getViewport({ scale: 1.0 });

        const scale = containerWidth / viewport.width;
        return await this.setScale(scale);
    }

    /**
     * Get current PDF info
     * @returns {Object} Current PDF information
     */
    getCurrentInfo() {
        if (!this.currentPdf) {
            return {
                loaded: false,
                filename: null,
                currentPage: 0,
                totalPages: 0,
                scale: this.scale
            };
        }

        // Find filename for current PDF
        let filename = null;
        for (const [name, pdf] of this.pdfs.entries()) {
            if (pdf === this.currentPdf) {
                filename = name;
                break;
            }
        }

        return {
            loaded: true,
            filename: filename,
            currentPage: this.currentPage,
            totalPages: this.currentPdf.numPages,
            scale: this.scale
        };
    }

    /**
     * Export current page as image
     * @param {String} format - Image format (png, jpeg)
     * @returns {String} Data URL of image
     */
    exportPageAsImage(format = 'png') {
        if (!this.canvas) return null;

        return this.canvas.toDataURL(`image/${format}`);
    }

    /**
     * Clear all loaded PDFs
     */
    clear() {
        this.pdfs.clear();
        this.currentPdf = null;
        this.currentPage = 1;

        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Get list of loaded PDFs
     * @returns {Array} List of loaded PDF filenames
     */
    getLoadedPDFs() {
        return Array.from(this.pdfs.keys());
    }
}

    // Export to global namespace
    window.VioboxSystem.PDFManager = PDFManager;
})();