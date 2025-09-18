/**
 * PDFManager Mobile-Optimized Version
 * Progressive loading, memory management, and error recovery
 */

export class PDFManagerMobile {
    constructor(config = {}) {
        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = config.workerSrc ||
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        // Memory management settings
        this.MAX_CACHED_PDFS = this.detectDeviceCapability();
        this.MAX_MEMORY_MB = config.maxMemoryMB || 100; // 100MB max memory
        this.CHUNK_SIZE = config.chunkSize || 5; // Load PDFs in chunks

        // PDF storage with LRU cache
        this.pdfCache = new Map();
        this.pdfMetadata = new Map(); // Store metadata without loading full PDF
        this.loadQueue = [];
        this.isLoading = false;
        this.failedLoads = new Map();

        // Current state
        this.currentPdfName = null;
        this.currentPdfDoc = null;
        this.currentPage = 1;
        this.scale = config.initialScale || this.getOptimalScale();

        // Canvas
        this.canvas = null;
        this.ctx = null;
        this.config = config;

        // Memory monitoring
        this.memoryUsage = 0;
        this.startMemoryMonitoring();

        // Error recovery
        this.errorRetryCount = new Map();
        this.MAX_RETRIES = 3;
    }

    /**
     * Detect device capability for optimal performance
     */
    detectDeviceCapability() {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const memoryGB = navigator.deviceMemory || 2; // Default 2GB if not available

        if (isMobile) {
            if (memoryGB <= 2) return 1; // Low-end device: cache 1 PDF
            if (memoryGB <= 4) return 3; // Mid-range: cache 3 PDFs
            return 5; // High-end mobile: cache 5 PDFs
        }

        // Desktop
        if (memoryGB <= 4) return 10;
        if (memoryGB <= 8) return 20;
        return 30;
    }

    /**
     * Get optimal scale for device
     */
    getOptimalScale() {
        const width = window.innerWidth;
        if (width < 480) return 0.5;  // Small phones
        if (width < 768) return 0.75; // Phones
        if (width < 1024) return 1.0; // Tablets
        return 1.0; // Desktop
    }

    /**
     * Progressive PDF loading with queue management
     */
    async loadPDFsProgressive(files) {
        const fileArray = Array.from(files);
        const results = {
            loaded: [],
            failed: [],
            queued: [],
            total: fileArray.length
        };

        // Store metadata for all PDFs
        for (const file of fileArray) {
            if (file.type === 'application/pdf') {
                this.pdfMetadata.set(file.name, {
                    file: file,
                    size: file.size,
                    loaded: false,
                    loading: false
                });
                this.loadQueue.push(file.name);
            }
        }

        // Load first chunk immediately
        const firstChunk = this.loadQueue.slice(0, this.CHUNK_SIZE);
        for (const filename of firstChunk) {
            await this.loadSinglePDF(filename);
        }

        // Continue loading in background
        this.processLoadQueue();

        return results;
    }

    /**
     * Load single PDF with memory management
     */
    async loadSinglePDF(filename) {
        const metadata = this.pdfMetadata.get(filename);
        if (!metadata) return null;

        // Check if already loading or loaded
        if (metadata.loading || metadata.loaded) {
            return this.pdfCache.get(filename);
        }

        // Check memory before loading
        if (!this.canLoadPDF(metadata.size)) {
            await this.freeMemory();
        }

        metadata.loading = true;

        try {
            const file = metadata.file;

            // Use streaming for large PDFs
            const useStreaming = file.size > 5 * 1024 * 1024; // 5MB

            let pdfDoc;
            if (useStreaming) {
                pdfDoc = await this.loadPDFStreaming(file);
            } else {
                const arrayBuffer = await file.arrayBuffer();
                const typedArray = new Uint8Array(arrayBuffer);

                const loadingTask = pdfjsLib.getDocument({
                    data: typedArray,
                    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                    cMapPacked: true,
                    disableAutoFetch: true, // Don't fetch all pages
                    disableStream: false,
                    disableFontFace: false
                });

                pdfDoc = await loadingTask.promise;
            }

            // Update cache with LRU
            this.updateLRUCache(filename, pdfDoc);

            metadata.loaded = true;
            metadata.loading = false;
            this.memoryUsage += metadata.size;

            return pdfDoc;

        } catch (error) {
            metadata.loading = false;
            this.handleLoadError(filename, error);
            return null;
        }
    }

    /**
     * Stream-load large PDFs
     */
    async loadPDFStreaming(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const loadingTask = pdfjsLib.getDocument({
                        data: typedArray,
                        disableAutoFetch: true,
                        disableStream: false
                    });

                    const pdfDoc = await loadingTask.promise;
                    resolve(pdfDoc);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * LRU Cache management
     */
    updateLRUCache(filename, pdfDoc) {
        // Remove from current position if exists
        if (this.pdfCache.has(filename)) {
            this.pdfCache.delete(filename);
        }

        // Add to end (most recently used)
        this.pdfCache.set(filename, pdfDoc);

        // Evict if over limit
        while (this.pdfCache.size > this.MAX_CACHED_PDFS) {
            const firstKey = this.pdfCache.keys().next().value;
            this.evictPDF(firstKey);
        }
    }

    /**
     * Evict PDF from cache
     */
    evictPDF(filename) {
        const pdfDoc = this.pdfCache.get(filename);
        if (pdfDoc) {
            // Clean up PDF.js resources
            if (pdfDoc.cleanup) {
                pdfDoc.cleanup();
            }
            if (pdfDoc.destroy) {
                pdfDoc.destroy();
            }

            this.pdfCache.delete(filename);

            const metadata = this.pdfMetadata.get(filename);
            if (metadata) {
                this.memoryUsage -= metadata.size;
                metadata.loaded = false;
            }
        }
    }

    /**
     * Check if we can load a PDF of given size
     */
    canLoadPDF(size) {
        const sizeMB = size / (1024 * 1024);
        const currentMB = this.memoryUsage / (1024 * 1024);
        return (currentMB + sizeMB) < this.MAX_MEMORY_MB;
    }

    /**
     * Free memory by evicting LRU PDFs
     */
    async freeMemory() {
        const target = this.MAX_MEMORY_MB * 0.7; // Free to 70% capacity

        while (this.memoryUsage / (1024 * 1024) > target && this.pdfCache.size > 0) {
            const firstKey = this.pdfCache.keys().next().value;
            this.evictPDF(firstKey);
        }

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
    }

    /**
     * Process load queue in background
     */
    async processLoadQueue() {
        if (this.isLoading) return;
        this.isLoading = true;

        while (this.loadQueue.length > 0) {
            const batch = this.loadQueue.splice(0, this.CHUNK_SIZE);

            for (const filename of batch) {
                const metadata = this.pdfMetadata.get(filename);
                if (metadata && !metadata.loaded) {
                    await this.loadSinglePDF(filename);

                    // Yield to browser for responsiveness
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            // Longer pause between batches
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.isLoading = false;
    }

    /**
     * Handle PDF load errors with retry
     */
    handleLoadError(filename, error) {
        console.error(`Error loading PDF ${filename}:`, error);

        const retryCount = this.errorRetryCount.get(filename) || 0;

        if (retryCount < this.MAX_RETRIES) {
            this.errorRetryCount.set(filename, retryCount + 1);

            // Retry with exponential backoff
            setTimeout(() => {
                this.loadQueue.unshift(filename); // Add to front of queue
                this.processLoadQueue();
            }, Math.pow(2, retryCount) * 1000);

        } else {
            this.failedLoads.set(filename, error.message);

            // Notify UI of failure
            if (this.config.onLoadError) {
                this.config.onLoadError(filename, error);
            }
        }
    }

    /**
     * Display PDF with lazy loading
     */
    async displayPDF(filename) {
        // Check if in cache
        let pdfDoc = this.pdfCache.get(filename);

        if (!pdfDoc) {
            // Show loading state
            if (this.config.onLoadStart) {
                this.config.onLoadStart(filename);
            }

            // Load on demand
            pdfDoc = await this.loadSinglePDF(filename);

            if (!pdfDoc) {
                if (this.config.onLoadError) {
                    this.config.onLoadError(filename, new Error('Failed to load PDF'));
                }
                return null;
            }
        }

        // Update LRU position
        this.updateLRUCache(filename, pdfDoc);

        this.currentPdfDoc = pdfDoc;
        this.currentPdfName = filename;
        this.currentPage = 1;

        // Render first page
        await this.renderPage(1);

        if (this.config.onLoadComplete) {
            this.config.onLoadComplete(filename);
        }

        return pdfDoc;
    }

    /**
     * Render page with memory optimization
     */
    async renderPage(pageNum) {
        if (!this.currentPdfDoc || !this.canvas) return;

        try {
            const page = await this.currentPdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.scale });

            // Adjust canvas size
            this.canvas.height = viewport.height;
            this.canvas.width = viewport.width;

            // Mobile optimization: use lower quality on small screens
            const outputScale = window.devicePixelRatio || 1;
            const transform = outputScale !== 1
                ? [outputScale, 0, 0, outputScale, 0, 0]
                : null;

            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport,
                transform: transform,
                intent: 'display' // Use 'print' for higher quality
            };

            // Clear previous render
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Render with cancellation support
            const renderTask = page.render(renderContext);
            await renderTask.promise;

            // Clean up page resources
            if (page.cleanup) {
                page.cleanup();
            }

        } catch (error) {
            console.error('Error rendering page:', error);
            if (this.config.onRenderError) {
                this.config.onRenderError(error);
            }
        }
    }

    /**
     * Memory monitoring
     */
    startMemoryMonitoring() {
        if (!performance.memory) return; // Not available in all browsers

        setInterval(() => {
            const used = performance.memory.usedJSHeapSize;
            const limit = performance.memory.jsHeapSizeLimit;
            const percentage = (used / limit) * 100;

            if (percentage > 80) {
                console.warn('High memory usage detected:', percentage.toFixed(1) + '%');
                this.freeMemory();
            }
        }, 10000); // Check every 10 seconds
    }

    /**
     * Clean up all resources
     */
    destroy() {
        // Clean all cached PDFs
        for (const [filename, pdfDoc] of this.pdfCache) {
            if (pdfDoc.destroy) {
                pdfDoc.destroy();
            }
        }

        this.pdfCache.clear();
        this.pdfMetadata.clear();
        this.loadQueue = [];
        this.failedLoads.clear();
        this.errorRetryCount.clear();

        // Clear canvas
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Get loading status
     */
    getStatus() {
        return {
            cached: this.pdfCache.size,
            total: this.pdfMetadata.size,
            queued: this.loadQueue.length,
            failed: this.failedLoads.size,
            memoryUsageMB: (this.memoryUsage / (1024 * 1024)).toFixed(2),
            maxCached: this.MAX_CACHED_PDFS
        };
    }
}