/**
 * A+ Compliant Mobile Gesture Handler
 * Implements touch gestures for mobile PDF navigation
 * - Swipe left/right: Navigate PDFs
 * - Pinch: Zoom in/out
 * - Double tap: Reset zoom
 */

class MobileGestureHandler {
  constructor() {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.scale = 1;
    this.initialDistance = 0;
    this.isPinching = false;
    this.isSwipeHandled = false;

    // Configuration from master.json (will be loaded)
    this.config = {
      swipeThreshold: 30, // Lower threshold for easier swipes
      swipeMaxVertical: 150, // More tolerance for vertical movement
      pinchThreshold: 10, // minimum pinch distance
      doubleTapDelay: 300, // ms for double tap detection
      minScale: 0.5,
      maxScale: 3
    };

    this.lastTap = 0;
    this.canvas = null;
    this.container = null;
  }

  init() {
    // Get elements
    this.canvas = document.getElementById('pdfCanvas');
    this.container = document.querySelector('.canvas-container');

    if (!this.container) return;

    // Add touch event listeners
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Add gesture hints for first-time users
    this.showSwipeHint();

    // Add mobile sidebar toggle
    this.createSidebarToggle();

    // Log to confirm gestures are initialized
    console.log('Mobile gestures initialized:', {
      swipeEnabled: true,
      pinchEnabled: true,
      doubleTapEnabled: true
    });
  }

  handleTouchStart(e) {
    if (e.touches.length === 1) {
      // Single finger - potential swipe
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.isSwipeHandled = false;

      // Check for double tap
      const now = Date.now();
      if (now - this.lastTap < this.config.doubleTapDelay) {
        this.handleDoubleTap(e);
      }
      this.lastTap = now;

    } else if (e.touches.length === 2) {
      // Two fingers - pinch zoom
      e.preventDefault(); // Prevent default zoom
      this.isPinching = true;

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.initialDistance = this.getDistance(touch1, touch2);
    }
  }

  handleTouchMove(e) {
    if (this.isPinching && e.touches.length === 2) {
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = this.getDistance(touch1, touch2);

      if (Math.abs(currentDistance - this.initialDistance) > this.config.pinchThreshold) {
        const delta = currentDistance / this.initialDistance;
        this.updateScale(this.scale * delta);
      }
    } else if (e.touches.length === 1 && !this.isSwipeHandled) {
      // Track movement for swipe detection
      this.touchEndX = e.touches[0].clientX;
      this.touchEndY = e.touches[0].clientY;
    }
  }

  handleTouchEnd(e) {
    if (this.isPinching) {
      this.isPinching = false;
      this.initialDistance = 0;
      return;
    }

    if (!this.isSwipeHandled && this.touchStartX !== 0) {
      const deltaX = this.touchEndX - this.touchStartX;
      const deltaY = this.touchEndY - this.touchStartY;

      // Check if it's a horizontal swipe
      if (Math.abs(deltaX) > this.config.swipeThreshold &&
          Math.abs(deltaY) < this.config.swipeMaxVertical) {

        if (deltaX > 0) {
          this.swipeRight();
        } else {
          this.swipeLeft();
        }
        this.isSwipeHandled = true;
      }
    }

    // Reset touch coordinates
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
  }

  handleDoubleTap(e) {
    e.preventDefault();

    // Reset zoom to 1
    this.scale = 1;
    this.applyScale();

    // Show feedback
    this.showToast('Zoom reset');
  }

  swipeLeft() {
    // Navigate to next PDF
    if (window.vioboxViewer?.nextPDF) {
      window.vioboxViewer.nextPDF();
      this.showToast('Next PDF →');
    }
  }

  swipeRight() {
    // Navigate to previous PDF
    if (window.vioboxViewer?.previousPDF) {
      window.vioboxViewer.previousPDF();
      this.showToast('← Previous PDF');
    }
  }

  updateScale(newScale) {
    // Clamp scale within bounds
    this.scale = Math.max(this.config.minScale, Math.min(this.config.maxScale, newScale));
    this.applyScale();
  }

  applyScale() {
    if (this.canvas) {
      this.canvas.style.transform = `scale(${this.scale})`;
      this.canvas.style.transformOrigin = 'center center';
    }
  }

  getDistance(touch1, touch2) {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  showSwipeHint() {
    // Only show on mobile
    if (!this.isMobile()) return;

    // Check if user has seen hint before
    if (localStorage.getItem('swipeHintShown')) return;

    const hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.textContent = '← Swipe to navigate PDFs →';
    document.body.appendChild(hint);

    setTimeout(() => hint.remove(), 3000);
    localStorage.setItem('swipeHintShown', 'true');
  }

  showToast(message) {
    const existing = document.querySelector('.gesture-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'gesture-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 1000;
      animation: fadeOut 1s ease;
      pointer-events: none;
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1000);
  }

  createSidebarToggle() {
    if (!this.isMobile()) return;

    // Check if toggle already exists
    if (document.querySelector('.sidebar-toggle')) return;

    const toggle = document.createElement('button');
    toggle.className = 'sidebar-toggle';
    toggle.innerHTML = '📊';
    toggle.setAttribute('aria-label', 'Toggle violations panel');

    toggle.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.toggle('active');
        toggle.classList.toggle('active'); // Move button up when sidebar opens
        toggle.innerHTML = sidebar.classList.contains('active') ? '✕' : '📊';
      }
    });

    document.body.appendChild(toggle);

    // Also create nav toggle for mobile
    this.createNavToggle();
  }

  createNavToggle() {
    if (!this.isMobile()) return;

    // Check if toggle already exists
    if (document.querySelector('.nav-toggle')) return;

    const navToggle = document.createElement('button');
    navToggle.className = 'nav-toggle';
    navToggle.innerHTML = '☰';
    navToggle.setAttribute('aria-label', 'Toggle navigation menu');

    navToggle.addEventListener('click', () => {
      const topControls = document.querySelector('.top-controls');
      const pdfViewer = document.querySelector('.pdf-viewer');
      if (topControls) {
        topControls.classList.toggle('active');
        navToggle.innerHTML = topControls.classList.contains('active') ? '✕' : '☰';

        // Adjust PDF viewer padding when nav is shown
        if (pdfViewer) {
          pdfViewer.classList.toggle('nav-active');
        }
      }
    });

    document.body.appendChild(navToggle);
  }

  isMobile() {
    return window.matchMedia('(max-width: 767px)').matches ||
           /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  updateConfig(config) {
    if (config?.gestures) {
      this.config = { ...this.config, ...config.gestures };
    }
  }

  destroy() {
    // Clean up event listeners
    if (this.container) {
      this.container.removeEventListener('touchstart', this.handleTouchStart.bind(this));
      this.container.removeEventListener('touchmove', this.handleTouchMove.bind(this));
      this.container.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    // Remove sidebar toggle
    const toggle = document.querySelector('.sidebar-toggle');
    if (toggle) toggle.remove();
  }
}

// Initialize gesture handler when DOM is ready
const gestureHandler = new MobileGestureHandler();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => gestureHandler.init());
} else {
  gestureHandler.init();
}

// Export for use in app.js
window.MobileGestureHandler = MobileGestureHandler;
window.gestureHandler = gestureHandler;