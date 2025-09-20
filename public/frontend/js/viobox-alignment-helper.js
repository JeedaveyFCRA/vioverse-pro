/**
 * VioBox Alignment Helper - Ensures proper positioning at all zoom levels
 */

class VioBoxAlignmentHelper {
  static syncOverlayToCanvas(canvas, overlay) {
    // Get the actual rendered size of the canvas
    const canvasRect = canvas.getBoundingClientRect();

    // Set overlay to match canvas internal dimensions
    overlay.style.width = `${canvas.width}px`;
    overlay.style.height = `${canvas.height}px`;

    // Calculate display scale
    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;

    // Apply transform if canvas is scaled
    if (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01) {
      // Canvas is being displayed at a different size than its internal resolution
      overlay.style.transform = `scale(${scaleX}, ${scaleY})`;
      overlay.style.transformOrigin = 'top left';
    } else {
      // Reset transform if no scaling
      overlay.style.transform = '';
      overlay.style.transformOrigin = '';
    }

    // Ensure overlay is positioned correctly relative to canvas
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.pointerEvents = 'none';

    console.log(`📐 Overlay synced: Canvas ${canvas.width}x${canvas.height}, Display ${canvasRect.width.toFixed(1)}x${canvasRect.height.toFixed(1)}, Scale ${scaleX.toFixed(2)}`);
  }

  static adjustVioBoxPosition(box, violation, scale) {
    // The CSV coordinates are the source of truth
    // They represent positions at scale 1.0

    // Apply scale to get display coordinates
    const displayX = violation.x * scale;
    const displayWidth = violation.width * scale;
    const displayHeight = violation.height * scale;

    // CRITICAL: Y is at bottom of box in CSV
    const displayY = (violation.y * scale) - displayHeight;

    // Apply padding if needed (expands from center)
    const padding = window.vioboxSystem?.vioboxPadding || 0;
    const paddedX = displayX - (padding / 2);
    const paddedY = displayY - (padding / 2);
    const paddedWidth = displayWidth + padding;
    const paddedHeight = displayHeight + padding;

    // Set position
    box.style.left = `${paddedX}px`;
    box.style.top = `${paddedY}px`;
    box.style.width = `${paddedWidth}px`;
    box.style.height = `${paddedHeight}px`;

    return {
      x: paddedX,
      y: paddedY,
      width: paddedWidth,
      height: paddedHeight
    };
  }

  static debugAlignment(canvas, overlay, violations) {
    console.group('🔍 VioBox Alignment Debug');

    const canvasRect = canvas.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    console.log('Canvas dimensions:', {
      internal: { width: canvas.width, height: canvas.height },
      displayed: { width: canvasRect.width, height: canvasRect.height },
      position: { top: canvasRect.top, left: canvasRect.left }
    });

    console.log('Overlay dimensions:', {
      style: { width: overlay.style.width, height: overlay.style.height },
      displayed: { width: overlayRect.width, height: overlayRect.height },
      position: { top: overlayRect.top, left: overlayRect.left }
    });

    console.log('Alignment check:', {
      widthMatch: Math.abs(canvasRect.width - overlayRect.width) < 1,
      heightMatch: Math.abs(canvasRect.height - overlayRect.height) < 1,
      positionMatch: Math.abs(canvasRect.top - overlayRect.top) < 1 && Math.abs(canvasRect.left - overlayRect.left) < 1
    });

    if (violations && violations.length > 0) {
      console.log(`First violation coordinates (sample):`, violations[0]);
    }

    console.groupEnd();
  }
}

// Export for use
window.VioBoxAlignmentHelper = VioBoxAlignmentHelper;