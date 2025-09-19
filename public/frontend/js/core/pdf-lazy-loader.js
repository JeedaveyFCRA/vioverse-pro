/**
 * A+ Compliant PDF Lazy Loader
 * Implements on-demand PDF loading to prevent mobile crashes
 * Performance Budget: Max 5 PDFs loaded at once
 * Memory Budget: Max 10MB active PDFs
 */

class PDFLazyLoader {
  constructor(config = {}) {
    // A+ Law: Data-driven configuration
    this.config = {
      maxConcurrent: config.maxConcurrent || 5,
      maxMemoryMB: config.maxMemoryMB || 10,
      preloadNext: config.preloadNext || 2,
      mobileMaxConcurrent: config.mobileMaxConcurrent || 2,
      mobileMaxMemoryMB: config.mobileMaxMemoryMB || 5,
      ...config
    };

    this.loadedPDFs = new Map();
    this.loadingPDFs = new Set();
    this.pdfQueue = [];
    this.memoryUsage = 0;
    this.isMobile = this.detectMobile();

    // Adjust limits for mobile
    if (this.isMobile) {
      this.config.maxConcurrent = this.config.mobileMaxConcurrent;
      this.config.maxMemoryMB = this.config.mobileMaxMemoryMB;
    }

    // Setup IntersectionObserver for viewport-based loading
    this.setupObserver();
  }

  detectMobile() {
    return window.matchMedia('(max-width: 768px)').matches ||
           /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  setupObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pdfUrl = entry.target.dataset.pdfUrl;
          if (pdfUrl && !this.loadedPDFs.has(pdfUrl)) {
            this.queuePDF(pdfUrl, entry.target);
          }
        }
      });
    }, {
      rootMargin: '50px', // Start loading 50px before visible
      threshold: 0.01
    });
  }

  observeElement(element, pdfUrl) {
    element.dataset.pdfUrl = pdfUrl;
    this.observer.observe(element);
  }

  async queuePDF(url, targetElement) {
    if (this.loadingPDFs.has(url) || this.loadedPDFs.has(url)) {
      return;
    }

    this.pdfQueue.push({ url, targetElement });
    this.processQueue();
  }

  async processQueue() {
    while (this.pdfQueue.length > 0 &&
           this.loadingPDFs.size < this.config.maxConcurrent &&
           this.memoryUsage < this.config.maxMemoryMB * 1024 * 1024) {

      const { url, targetElement } = this.pdfQueue.shift();
      this.loadPDF(url, targetElement);
    }
  }

  async loadPDF(url, targetElement) {
    if (this.loadingPDFs.has(url) || this.loadedPDFs.has(url)) {
      return;
    }

    this.loadingPDFs.add(url);

    try {
      // Show loading state
      if (targetElement) {
        targetElement.classList.add('pdf-loading');
        targetElement.setAttribute('aria-busy', 'true');
      }

      const response = await fetch(url);
      const blob = await response.blob();

      // Check memory before keeping in cache
      if (this.memoryUsage + blob.size > this.config.maxMemoryMB * 1024 * 1024) {
        this.evictOldest();
      }

      const objectUrl = URL.createObjectURL(blob);
      this.loadedPDFs.set(url, {
        objectUrl,
        size: blob.size,
        timestamp: Date.now(),
        element: targetElement
      });

      this.memoryUsage += blob.size;

      // Update UI
      if (targetElement) {
        targetElement.classList.remove('pdf-loading');
        targetElement.classList.add('pdf-loaded');
        targetElement.setAttribute('aria-busy', 'false');

        // Dispatch event for app to handle
        targetElement.dispatchEvent(new CustomEvent('pdfLoaded', {
          detail: { url, objectUrl, size: blob.size }
        }));
      }

    } catch (error) {
      console.error(`Failed to load PDF: ${url}`, error);
      if (targetElement) {
        targetElement.classList.remove('pdf-loading');
        targetElement.classList.add('pdf-error');
        targetElement.setAttribute('aria-busy', 'false');
        targetElement.setAttribute('aria-invalid', 'true');
      }
    } finally {
      this.loadingPDFs.delete(url);
      this.processQueue();
    }
  }

  evictOldest() {
    let oldest = null;
    let oldestTime = Infinity;

    for (const [url, data] of this.loadedPDFs.entries()) {
      if (data.timestamp < oldestTime) {
        oldest = url;
        oldestTime = data.timestamp;
      }
    }

    if (oldest) {
      this.unloadPDF(oldest);
    }
  }

  unloadPDF(url) {
    const data = this.loadedPDFs.get(url);
    if (data) {
      URL.revokeObjectURL(data.objectUrl);
      this.memoryUsage -= data.size;
      this.loadedPDFs.delete(url);

      if (data.element) {
        data.element.classList.remove('pdf-loaded');
        data.element.dispatchEvent(new CustomEvent('pdfUnloaded', {
          detail: { url }
        }));
      }
    }
  }

  getPDF(url) {
    const data = this.loadedPDFs.get(url);
    return data ? data.objectUrl : null;
  }

  preloadPDFs(urls) {
    // Preload up to config.preloadNext PDFs
    urls.slice(0, this.config.preloadNext).forEach(url => {
      if (!this.loadedPDFs.has(url) && !this.loadingPDFs.has(url)) {
        this.queuePDF(url, null);
      }
    });
  }

  getStats() {
    return {
      loaded: this.loadedPDFs.size,
      loading: this.loadingPDFs.size,
      queued: this.pdfQueue.length,
      memoryMB: (this.memoryUsage / 1024 / 1024).toFixed(2),
      maxMemoryMB: this.config.maxMemoryMB,
      isMobile: this.isMobile
    };
  }

  destroy() {
    // Clean up all resources
    this.observer.disconnect();

    for (const [url] of this.loadedPDFs.entries()) {
      this.unloadPDF(url);
    }

    this.loadedPDFs.clear();
    this.loadingPDFs.clear();
    this.pdfQueue = [];
    this.memoryUsage = 0;
  }
}

// Export for use in app
window.PDFLazyLoader = PDFLazyLoader;