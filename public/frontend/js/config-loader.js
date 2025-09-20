/**
 * Config Loader - A+ Compliant Data-Driven CSS Variable Injector
 * Loads configuration from JSON and injects as CSS variables
 * Ensures 100% data-driven architecture with zero hardcoding
 */

class ConfigLoader {
  constructor() {
    this.config = null;
  }

  async init() {
    try {
      // Load UI configuration
      const response = await fetch('../data/config/ui-config.json');
      this.config = await response.json();

      // Inject CSS variables from config
      this.injectCSSVariables();

      console.log('✅ Config Loader: CSS variables injected from JSON');
    } catch (error) {
      console.error('❌ Config Loader failed:', error);
    }
  }

  injectCSSVariables() {
    const root = document.documentElement;

    // Sidebar widths (data-driven)
    if (this.config.sidebar?.width) {
      root.style.setProperty('--sidebar-width-desktop',
        typeof this.config.sidebar.width.desktop === 'number'
          ? `${this.config.sidebar.width.desktop}px`
          : this.config.sidebar.width.desktop
      );
      root.style.setProperty('--sidebar-width-tablet',
        typeof this.config.sidebar.width.tablet === 'number'
          ? `${this.config.sidebar.width.tablet}px`
          : this.config.sidebar.width.tablet
      );
      root.style.setProperty('--sidebar-width-mobile',
        typeof this.config.sidebar.width.mobile === 'number'
          ? `${this.config.sidebar.width.mobile}px`
          : this.config.sidebar.width.mobile
      );
    }

    // Icon scales (data-driven)
    if (this.config.icons?.pageGrid) {
      root.style.setProperty('--icon-scale', this.config.icons.pageGrid.scale);
      root.style.setProperty('--icon-scale-hover', this.config.icons.pageGrid.scaleHover);
    }

    // Transition durations (data-driven)
    if (this.config.animations?.transitions) {
      root.style.setProperty('--transition-fast', this.config.animations.transitions.fast);
      root.style.setProperty('--transition-normal', this.config.animations.transitions.normal);
      root.style.setProperty('--transition-slow', this.config.animations.transitions.slow);
    }

    // Grid configurations
    if (this.config.grid) {
      // Desktop
      root.style.setProperty('--grid-columns-desktop', this.config.grid.desktop.columns);
      root.style.setProperty('--grid-gap', `${this.config.grid.desktop.gap}px`);

      // Tablet
      root.style.setProperty('--grid-columns-tablet', this.config.grid.tablet.columns);

      // Mobile
      root.style.setProperty('--grid-columns-mobile', this.config.grid.mobile.columns);
    }

    // Colors
    if (this.config.colors) {
      Object.entries(this.config.colors).forEach(([key, value]) => {
        const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        root.style.setProperty(cssVarName, value);
      });
    }
  }

  // Get config value by path (e.g., 'sidebar.width.desktop')
  getValue(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    window.configLoader = new ConfigLoader();
    await window.configLoader.init();
  });
} else {
  // DOM already loaded
  (async () => {
    window.configLoader = new ConfigLoader();
    await window.configLoader.init();
  })();
}