/**
 * Configuration Loader Module
 * Loads and validates all JSON configuration files
 * Sets CSS custom properties from theme configuration
 */

class ConfigLoader {
  constructor() {
    this.config = {};
    this.configFiles = [
      'app.config',
      'breakpoints',
      'bureaus',
      'defaults',
      'features',
      'navigation',
      'severity',
      'site',
      'theme',
      'ui',
      'ui-text'
    ];
  }

  /**
   * Load all configuration files
   * @returns {Promise<Object>} Combined configuration object
   */
  async loadAll() {
    try {
      const promises = this.configFiles.map(file => this.loadConfigFile(file));
      const results = await Promise.all(promises);

      // Combine all configs into single object
      results.forEach((data, index) => {
        const configName = this.configFiles[index].replace('.config', '').replace('-', '');
        this.config[configName] = data;
      });

      // Apply theme to CSS custom properties
      this.applyThemeVariables();

      // Validate critical configurations
      this.validateConfigs();

      return this.config;
    } catch (error) {
      console.error('Failed to load configurations:', error);
      throw error;
    }
  }

  /**
   * Load a single configuration file
   * @param {string} filename - Config file name without extension
   * @returns {Promise<Object>} Parsed JSON data
   */
  async loadConfigFile(filename) {
    try {
      const response = await fetch(`/data/config/${filename}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}.json: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error loading ${filename}.json:`, error);
      throw error;
    }
  }

  /**
   * Apply theme variables as CSS custom properties
   */
  applyThemeVariables() {
    const theme = this.config.theme;
    if (!theme) return;

    const root = document.documentElement;

    // Set color variables
    if (theme.colors) {
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${this.kebabCase(key)}`, value);
      });
    }

    // Set font variables
    if (theme.fonts) {
      Object.entries(theme.fonts).forEach(([key, value]) => {
        root.style.setProperty(`--font-${key}`, value);
      });
    }

    // Set spacing variables
    if (theme.spacing) {
      Object.entries(theme.spacing).forEach(([key, value]) => {
        root.style.setProperty(`--spacing-${key}`, value);
      });
    }

    // Set border radius variables
    if (theme.borderRadius) {
      Object.entries(theme.borderRadius).forEach(([key, value]) => {
        root.style.setProperty(`--radius-${key}`, value);
      });
    }

    // Set severity colors from severity config
    if (this.config.severity?.severityLevels) {
      Object.entries(this.config.severity.severityLevels).forEach(([level, data]) => {
        root.style.setProperty(`--severity-${level}-color`, data.color);
        root.style.setProperty(`--severity-${level}-fill`, data.fillColor);
        root.style.setProperty(`--severity-${level}-bg`, data.backgroundColor);
      });
    }

    // Set bureau colors
    if (this.config.bureaus?.bureaus) {
      Object.entries(this.config.bureaus.bureaus).forEach(([code, bureau]) => {
        root.style.setProperty(`--bureau-${code.toLowerCase()}-color`, bureau.color);
      });
    }

    // Set breakpoints as CSS variables
    if (this.config.breakpoints) {
      Object.entries(this.config.breakpoints).forEach(([key, value]) => {
        root.style.setProperty(`--breakpoint-${key}`, value);
      });
    }
  }

  /**
   * Validate critical configurations
   * @throws {Error} If validation fails
   */
  validateConfigs() {
    // Validate bureaus config
    if (!this.config.bureaus?.bureaus) {
      throw new Error('Invalid bureaus configuration: missing bureaus object');
    }

    // Validate severity levels
    if (!this.config.severity?.severityLevels) {
      throw new Error('Invalid severity configuration: missing severityLevels');
    }

    // Validate UI text
    if (!this.config.uitext?.titles || !this.config.uitext?.buttons || !this.config.uitext?.labels) {
      throw new Error('Invalid ui-text configuration: missing required sections');
    }

    // Validate theme
    if (!this.config.theme?.colors) {
      throw new Error('Invalid theme configuration: missing colors');
    }

    console.log('Configuration validation passed');
  }

  /**
   * Get configuration value by path
   * @param {string} path - Dot-notated path (e.g., 'theme.colors.primary')
   * @returns {*} Configuration value or undefined
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  /**
   * Get all configuration
   * @returns {Object} Complete configuration object
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get UI text for a specific key
   * @param {string} section - Section name (titles, buttons, labels, etc.)
   * @param {string} key - Text key
   * @returns {string} Localized text or key if not found
   */
  getText(section, key) {
    return this.config.uitext?.[section]?.[key] || key;
  }

  /**
   * Get severity configuration for a level
   * @param {string} level - Severity level (extreme, severe, serious, minor)
   * @returns {Object} Severity configuration
   */
  getSeverity(level) {
    return this.config.severity?.severityLevels?.[level.toLowerCase()] ||
           this.config.severity?.severityLevels?.unknown;
  }

  /**
   * Get bureau configuration
   * @param {string} code - Bureau code (TU, EX, EQ)
   * @returns {Object} Bureau configuration
   */
  getBureau(code) {
    return this.config.bureaus?.bureaus?.[code] || this.config.bureaus?.unknownBureau;
  }

  /**
   * Detect bureau from filename
   * @param {string} filename - File name to check
   * @returns {string} Bureau code or 'UNKNOWN'
   */
  detectBureauFromFilename(filename) {
    if (!filename) return 'UNKNOWN';

    for (const [code, bureau] of Object.entries(this.config.bureaus?.bureaus || {})) {
      for (const pattern of bureau.patterns || []) {
        if (filename.includes(pattern)) {
          return code;
        }
      }
    }
    return 'UNKNOWN';
  }

  /**
   * Convert string to kebab-case
   * @param {string} str - String to convert
   * @returns {string} Kebab-cased string
   */
  kebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Format a message with placeholders
   * @param {string} template - Message template with {placeholders}
   * @param {Object} values - Values to replace placeholders
   * @returns {string} Formatted message
   */
  formatMessage(template, values) {
    return template.replace(/{(\w+)}/g, (match, key) => values[key] || match);
  }

  /**
   * Get font string for canvas context
   * @param {string} type - Font type (label, body, heading)
   * @param {number} scale - Scale factor
   * @returns {string} Font string for canvas context
   */
  getCanvasFont(type = 'body', scale = 1) {
    const fontSize = this.config.theme?.canvas?.fontSize?.[type] ||
                    this.config.theme?.fontSize?.[type] || '16px';
    const fontWeight = this.config.theme?.canvas?.fontWeight?.normal || 'normal';
    const fontFamily = this.config.theme?.fonts?.sans || 'Inter, sans-serif';

    // Parse font size and apply scale
    const baseFontSize = parseFloat(fontSize) || 16;
    return `${fontWeight} ${baseFontSize * scale}px ${fontFamily.split(',')[0].trim()}`;
  }

  /**
   * Get VioBox label font
   * @param {number} scale - Scale factor
   * @returns {string} Font string for VioBox labels
   */
  getVioBoxLabelFont(scale = 1) {
    const fontSize = this.config.theme?.canvas?.fontSize?.label ||
                    this.config.theme?.fontSize?.vioboxLabel || '11px';
    const fontWeight = this.config.theme?.canvas?.fontWeight?.bold ||
                      this.config.theme?.fontWeight?.bold || 'bold';
    const fontFamily = (this.config.theme?.fonts?.sans || 'Arial').split(',')[0].trim();

    const baseFontSize = parseFloat(fontSize) || 11;
    return `${fontWeight} ${baseFontSize * scale}px ${fontFamily}`;
  }

  /**
   * Get tooltip styles
   * @returns {Object} Tooltip style configuration
   */
  getTooltipStyles() {
    const theme = this.config.theme;
    return {
      maxWidth: theme?.tooltip?.maxWidth || '300px',
      padding: theme?.tooltip?.padding || '12px',
      borderWidth: theme?.tooltip?.borderWidth || '1px',
      borderRadius: theme?.tooltip?.borderRadius || '6px',
      fontSize: theme?.tooltip?.fontSize || '12px',
      backgroundColor: theme?.tooltip?.backgroundColor || '#1a1a1a',
      borderColor: theme?.tooltip?.borderColor || '#333',
      textColor: theme?.tooltip?.textColor || '#fff',
      boxShadow: theme?.shadows?.tooltip || '0 4px 24px rgba(0, 0, 0, 0.8)'
    };
  }

  /**
   * Get border style
   * @param {string} thickness - Border thickness (thin, medium, thick)
   * @returns {string} Border value
   */
  getBorder(thickness = 'medium') {
    const borders = this.config.theme?.borders;
    const width = borders?.[thickness] || '2px';
    const style = borders?.style?.solid || 'solid';
    return `${width} ${style}`;
  }

  /**
   * Get grid configuration
   * @returns {Object} Grid configuration
   */
  getGridConfig() {
    return {
      padding: this.config.theme?.grid?.padding || '20px',
      gap: this.config.theme?.grid?.gap || '10px',
      headerOffset: this.config.theme?.grid?.headerOffset || '120px'
    };
  }
}

// Export to global namespace for both module and non-module usage
window.VioboxSystem = window.VioboxSystem || {};
window.VioboxSystem.configLoader = new ConfigLoader();