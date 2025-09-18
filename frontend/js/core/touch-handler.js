/**
 * TouchHandler - Adds touch gesture support for mobile devices
 * Handles pinch-to-zoom, swipe navigation, and double-tap
 */

export class TouchHandler {
    constructor(canvas, config = {}) {
        this.canvas = canvas;
        this.config = config;

        // Touch state
        this.touches = [];
        this.lastTouchDistance = 0;
        this.lastTouchTime = 0;
        this.swipeStartX = 0;
        this.swipeStartY = 0;
        this.isPinching = false;
        this.isSwping = false;

        // Zoom state
        this.currentScale = config.initialScale || 1.0;
        this.minScale = config.minScale || 0.5;
        this.maxScale = config.maxScale || 3.0;

        // Pan state
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;

        // Double-tap detection
        this.doubleTapDelay = 300; // ms
        this.lastTapTime = 0;

        // Initialize
        this.setupEventListeners();
    }

    /**
     * Set up all touch event listeners
     */
    setupEventListeners() {
        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });

        // Gesture events (iOS)
        this.canvas.addEventListener('gesturestart', this.handleGestureStart.bind(this), { passive: false });
        this.canvas.addEventListener('gesturechange', this.handleGestureChange.bind(this), { passive: false });
        this.canvas.addEventListener('gestureend', this.handleGestureEnd.bind(this), { passive: false });

        // Mouse events for desktop testing
        if (this.config.enableMouseEmulation) {
            this.setupMouseEmulation();
        }

        // Prevent default zoom behavior
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
    }

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        e.preventDefault();
        this.touches = Array.from(e.touches);

        if (this.touches.length === 1) {
            // Single touch - potential swipe or pan
            const touch = this.touches[0];
            this.swipeStartX = touch.clientX;
            this.swipeStartY = touch.clientY;

            // Check for double tap
            const now = Date.now();
            if (now - this.lastTapTime < this.doubleTapDelay) {
                this.handleDoubleTap(touch);
            }
            this.lastTapTime = now;

        } else if (this.touches.length === 2) {
            // Two fingers - pinch to zoom
            this.isPinching = true;
            this.lastTouchDistance = this.getTouchDistance();
        }
    }

    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        e.preventDefault();
        this.touches = Array.from(e.touches);

        if (this.touches.length === 1 && !this.isPinching) {
            // Pan or swipe
            const touch = this.touches[0];
            const deltaX = touch.clientX - this.swipeStartX;
            const deltaY = touch.clientY - this.swipeStartY;

            // Check if this is a swipe or pan
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > 10) { // Minimum distance to trigger
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    // Horizontal swipe
                    this.handleSwipe(deltaX);
                } else {
                    // Pan the canvas
                    this.handlePan(deltaX, deltaY);
                }
            }

        } else if (this.touches.length === 2 && this.isPinching) {
            // Pinch zoom
            const currentDistance = this.getTouchDistance();
            const scale = currentDistance / this.lastTouchDistance;

            this.handlePinchZoom(scale);
            this.lastTouchDistance = currentDistance;
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        const remainingTouches = Array.from(e.touches);

        if (this.touches.length === 1 && remainingTouches.length === 0) {
            // Single touch ended - check for swipe completion
            const touch = this.touches[0];
            const deltaX = touch.clientX - this.swipeStartX;
            const deltaY = touch.clientY - this.swipeStartY;

            const velocity = this.calculateSwipeVelocity(deltaX, deltaY);

            if (velocity > 0.5 && Math.abs(deltaX) > 50) {
                // Fast swipe - navigate PDFs
                if (this.config.onSwipe) {
                    this.config.onSwipe(deltaX > 0 ? 'right' : 'left');
                }
            }
        }

        this.touches = remainingTouches;

        if (this.touches.length < 2) {
            this.isPinching = false;
        }
    }

    /**
     * Handle touch cancel
     */
    handleTouchCancel(e) {
        this.touches = [];
        this.isPinching = false;
        this.isPanning = false;
    }

    /**
     * Handle double tap to zoom
     */
    handleDoubleTap(touch) {
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // Toggle between 100% and 200% zoom
        const targetScale = this.currentScale === 1.0 ? 2.0 : 1.0;

        this.animateZoom(targetScale, x, y);
    }

    /**
     * Handle pinch zoom
     */
    handlePinchZoom(scale) {
        const newScale = this.currentScale * scale;

        // Clamp scale
        this.currentScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));

        // Apply transform
        this.applyTransform();

        // Callback
        if (this.config.onZoom) {
            this.config.onZoom(this.currentScale);
        }
    }

    /**
     * Handle swipe gesture
     */
    handleSwipe(deltaX) {
        // Handled in touchend for navigation
    }

    /**
     * Handle pan gesture
     */
    handlePan(deltaX, deltaY) {
        if (this.currentScale > 1.0) {
            // Only allow panning when zoomed in
            this.panX += deltaX;
            this.panY += deltaY;

            // Apply bounds
            this.constrainPan();
            this.applyTransform();
        }
    }

    /**
     * Calculate distance between two touches
     */
    getTouchDistance() {
        if (this.touches.length < 2) return 0;

        const dx = this.touches[0].clientX - this.touches[1].clientX;
        const dy = this.touches[0].clientY - this.touches[1].clientY;

        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate swipe velocity
     */
    calculateSwipeVelocity(deltaX, deltaY) {
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const time = Date.now() - this.lastTapTime;

        return distance / time;
    }

    /**
     * Animate zoom with easing
     */
    animateZoom(targetScale, centerX, centerY) {
        const startScale = this.currentScale;
        const startTime = Date.now();
        const duration = 300; // ms

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            this.currentScale = startScale + (targetScale - startScale) * easeProgress;
            this.applyTransform();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Zoom complete
                if (this.config.onZoom) {
                    this.config.onZoom(this.currentScale);
                }
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Apply current transform to canvas
     */
    applyTransform() {
        const transform = `scale(${this.currentScale}) translate(${this.panX}px, ${this.panY}px)`;
        this.canvas.style.transform = transform;
        this.canvas.style.webkitTransform = transform;
    }

    /**
     * Constrain pan to bounds
     */
    constrainPan() {
        const rect = this.canvas.getBoundingClientRect();
        const parentRect = this.canvas.parentElement.getBoundingClientRect();

        const scaledWidth = rect.width * this.currentScale;
        const scaledHeight = rect.height * this.currentScale;

        const maxPanX = Math.max(0, (scaledWidth - parentRect.width) / 2);
        const maxPanY = Math.max(0, (scaledHeight - parentRect.height) / 2);

        this.panX = Math.max(-maxPanX, Math.min(maxPanX, this.panX));
        this.panY = Math.max(-maxPanY, Math.min(maxPanY, this.panY));
    }

    /**
     * Reset transform
     */
    reset() {
        this.currentScale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
    }

    /**
     * iOS Gesture Events
     */
    handleGestureStart(e) {
        e.preventDefault();
        this.gestureStartScale = this.currentScale;
    }

    handleGestureChange(e) {
        e.preventDefault();
        const scale = e.scale * this.gestureStartScale;
        this.currentScale = Math.max(this.minScale, Math.min(this.maxScale, scale));
        this.applyTransform();
    }

    handleGestureEnd(e) {
        e.preventDefault();
        if (this.config.onZoom) {
            this.config.onZoom(this.currentScale);
        }
    }

    /**
     * Mouse emulation for desktop testing
     */
    setupMouseEmulation() {
        let mouseDown = false;
        let lastMouseX = 0;
        let lastMouseY = 0;

        this.canvas.addEventListener('mousedown', (e) => {
            mouseDown = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!mouseDown) return;

            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;

            this.handlePan(deltaX, deltaY);

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });

        this.canvas.addEventListener('mouseup', () => {
            mouseDown = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scale = e.deltaY > 0 ? 0.9 : 1.1;
            this.handlePinchZoom(scale);
        });
    }

    /**
     * Destroy handler and remove listeners
     */
    destroy() {
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchCancel);
        this.reset();
    }
}