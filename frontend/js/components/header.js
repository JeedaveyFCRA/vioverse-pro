/**
 * Header Component - A+ Compliant Data-Driven Navigation
 * Renders the top navigation bar from configuration
 * Zero hardcoding - all text, icons, and controls from JSON
 */

export class HeaderComponent {
  constructor(config) {
    this.config = config;
    this.element = null;
  }

  /**
   * Create the header HTML structure from config
   * @param {Object} options - Component options
   * @returns {HTMLElement} Header element
   */
  render(options = {}) {
    const header = document.createElement('header');
    header.className = 'top-bar';

    // Left section
    const leftSection = this.renderLeftSection(options.leftControls);

    // Center section with brand and panel controls
    const centerSection = this.renderCenterSection(options.brand, options.panels);

    // Right section with controls
    const rightSection = this.renderRightSection(options.rightControls);

    header.appendChild(leftSection);
    header.appendChild(centerSection);
    header.appendChild(rightSection);

    this.element = header;
    this.initializeIcons();

    return header;
  }

  renderLeftSection(controls = []) {
    const section = document.createElement('div');
    section.className = 'top-bar-left';

    controls.forEach(control => {
      const button = this.createButton(control);
      section.appendChild(button);
    });

    return section;
  }

  renderCenterSection(brandConfig, panels = []) {
    const section = document.createElement('div');
    section.className = 'top-bar-center';

    // Brand
    if (brandConfig) {
      const brandDiv = document.createElement('div');
      brandDiv.className = 'brand';
      const brandText = document.createElement('span');
      brandText.className = 'brand-text';
      brandText.textContent = brandConfig.text || '';
      brandDiv.appendChild(brandText);
      section.appendChild(brandDiv);
    }

    // Panel controls
    if (panels.length > 0) {
      const panelControls = document.createElement('div');
      panelControls.className = 'panel-controls';

      panels.forEach((panel, index) => {
        const button = this.createPanelButton(panel, index === 0);
        panelControls.appendChild(button);
      });

      section.appendChild(panelControls);
    }

    return section;
  }

  renderRightSection(controls = []) {
    const section = document.createElement('div');
    section.className = 'top-bar-right';

    controls.forEach(control => {
      const element = this.createControl(control);
      if (element) section.appendChild(element);
    });

    return section;
  }

  createButton(config) {
    const button = document.createElement('button');
    button.className = config.className || 'panel-toggle';
    if (config.dataPanel) button.dataset.panel = config.dataPanel;
    if (config.ariaLabel) button.setAttribute('aria-label', config.ariaLabel);

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', config.icon);
    button.appendChild(icon);

    return button;
  }

  createPanelButton(panel, isActive = false) {
    const button = document.createElement('button');
    button.className = isActive ? 'panel-toggle active' : 'panel-toggle';
    button.dataset.panel = panel.id;
    button.setAttribute('aria-label', panel.label);

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', panel.icon);
    button.appendChild(icon);

    return button;
  }

  createControl(control) {
    switch (control.type) {
      case 'zoom':
        return this.createZoomControls(control);
      case 'counter':
        return this.createCounter(control);
      case 'indicator':
        return this.createIndicator(control);
      case 'button':
        return this.createButton(control);
      default:
        return null;
    }
  }

  createZoomControls(config) {
    const container = document.createElement('div');
    container.className = 'zoom-controls';

    const zoomOut = document.createElement('button');
    zoomOut.className = 'zoom-btn';
    zoomOut.id = 'zoomOut';
    zoomOut.title = config.zoomOutTitle || 'Zoom Out (-)';
    const zoomOutIcon = document.createElement('i');
    zoomOutIcon.setAttribute('data-lucide', 'zoom-out');
    zoomOut.appendChild(zoomOutIcon);

    const level = document.createElement('span');
    level.className = 'zoom-level';
    level.id = 'zoomLevel';
    level.textContent = config.defaultLevel || '100%';

    const zoomIn = document.createElement('button');
    zoomIn.className = 'zoom-btn';
    zoomIn.id = 'zoomIn';
    zoomIn.title = config.zoomInTitle || 'Zoom In (+)';
    const zoomInIcon = document.createElement('i');
    zoomInIcon.setAttribute('data-lucide', 'zoom-in');
    zoomIn.appendChild(zoomInIcon);

    container.appendChild(zoomOut);
    container.appendChild(level);
    container.appendChild(zoomIn);

    return container;
  }

  createCounter(config) {
    const container = document.createElement('div');
    container.className = config.className || 'violation-counter';

    const label = document.createElement('span');
    label.className = config.labelClass || 'violation-label';
    label.textContent = config.label || '';

    const count = document.createElement('span');
    count.className = config.countClass || 'violation-count';
    count.id = config.countId || 'violationCount';
    count.textContent = config.defaultValue || '0';

    container.appendChild(label);
    container.appendChild(count);

    return container;
  }

  createIndicator(config) {
    const container = document.createElement('div');
    container.className = config.className || 'bureau-indicator';

    const label = document.createElement('span');
    label.className = config.labelClass || 'bureau-label';
    label.textContent = config.label || '';

    const value = document.createElement('span');
    value.className = config.valueClass || 'bureau-name';
    value.id = config.valueId || 'currentBureauName';
    value.textContent = config.defaultValue || '-';

    container.appendChild(label);
    container.appendChild(value);

    return container;
  }

  initializeIcons() {
    // Initialize Lucide icons if available
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Update header based on context
   * @param {Object} updates - Values to update
   */
  update(updates) {
    if (updates.zoomLevel) {
      const zoomElement = this.element.querySelector('#zoomLevel');
      if (zoomElement) zoomElement.textContent = updates.zoomLevel;
    }

    if (updates.violationCount !== undefined) {
      const countElement = this.element.querySelector('#violationCount');
      if (countElement) countElement.textContent = updates.violationCount;
    }

    if (updates.bureau) {
      const bureauElement = this.element.querySelector('#currentBureauName');
      if (bureauElement) bureauElement.textContent = updates.bureau;
    }
  }

  /**
   * Attach event handlers
   * @param {Object} handlers - Event handler functions
   */
  attachHandlers(handlers = {}) {
    if (handlers.onPanelChange) {
      this.element.querySelectorAll('.panel-toggle').forEach(button => {
        button.addEventListener('click', () => {
          const panel = button.dataset.panel;
          if (panel) handlers.onPanelChange(panel, button);
        });
      });
    }

    if (handlers.onZoomIn) {
      const zoomIn = this.element.querySelector('#zoomIn');
      if (zoomIn) zoomIn.addEventListener('click', handlers.onZoomIn);
    }

    if (handlers.onZoomOut) {
      const zoomOut = this.element.querySelector('#zoomOut');
      if (zoomOut) zoomOut.addEventListener('click', handlers.onZoomOut);
    }
  }
}

// Export for module usage
export default HeaderComponent;