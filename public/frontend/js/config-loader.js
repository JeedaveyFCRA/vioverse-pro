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
      // Load both UI and theme configuration
      const [uiResponse, themeResponse] = await Promise.all([
        fetch('../data/config/ui-config.json'),
        fetch('../data/config/theme.json')
      ]);

      const uiConfig = await uiResponse.json();
      const themeConfig = await themeResponse.json();

      // Merge configs with theme taking precedence for colors
      this.config = { ...uiConfig, ...themeConfig };

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

    // Colors - handle nested structure
    if (this.config.colors) {
      const flattenColors = (obj, prefix = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'object' && !Array.isArray(value)) {
            // Recurse for nested objects
            flattenColors(value, `${prefix}${key}-`);
          } else {
            // Convert camelCase to kebab-case and create CSS variable
            const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            const kebabPrefix = prefix.replace(/([A-Z])/g, '-$1').toLowerCase();
            const cssVarName = `--color-${kebabPrefix}${kebabKey}`;
            root.style.setProperty(cssVarName, value);
          }
        });
      };
      flattenColors(this.config.colors);
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