/**
 * Configuration Loader for Frontend JavaScript
 * Loads UI configuration from the server config endpoint
 */

class ConfigLoader {
    constructor() {
        this.config = null;
        this.loading = false;
        this.loadPromise = null;
    }

    /**
     * Load configuration from the server
     * @returns {Promise<Object>} The UI configuration
     */
    async loadConfig() {
        // Return cached config if already loaded
        if (this.config) {
            return this.config;
        }

        // Return existing promise if loading
        if (this.loadPromise) {
            return this.loadPromise;
        }

        // Start loading
        this.loadPromise = this._fetchConfig();
        return this.loadPromise;
    }

    /**
     * Internal method to fetch configuration
     */
    async _fetchConfig() {
        try {
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.statusText}`);
            }

            const data = await response.json();

            // Load UI config from file if not in API response
            // In production, this would come from the API
            this.config = data.ui || await this._loadUIConfig();

            return this.config;
        } catch (error) {
            console.error('Failed to load configuration:', error);
            // Return default config on error
            return this._getDefaultConfig();
        }
    }

    /**
     * Load UI config directly from JSON file
     */
    async _loadUIConfig() {
        try {
            const response = await fetch('/data/config/ui.json');
            if (!response.ok) {
                throw new Error('Failed to load UI config');
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to load UI config:', error);
            return this._getDefaultConfig();
        }
    }

    /**
     * Get a value from the config by path
     * @param {String} path - Dot-separated path (e.g., 'labels.search')
     * @param {*} defaultValue - Default value if path not found
     */
    async get(path, defaultValue = '') {
        const config = await this.loadConfig();

        const parts = path.split('.');
        let value = config;

        for (const part of parts) {
            value = value?.[part];
            if (value === undefined) {
                console.warn(`Config value not found for path: ${path}`);
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * Get severity configuration
     */
    async getSeverities() {
        const config = await this.loadConfig();
        return config.violations?.severities || ['extreme', 'severe', 'serious', 'minor', 'unknown'];
    }

    /**
     * Get bureau configuration
     */
    async getBureaus() {
        const config = await this.loadConfig();
        return config.violations?.bureaus || ['TU', 'EQ', 'EX', 'UNKNOWN'];
    }

    /**
     * Get element IDs
     */
    async getElementId(key) {
        const config = await this.loadConfig();
        return config.elements?.ids?.[key] || key;
    }

    /**
     * Get violation messages
     */
    async getViolationMessage(key) {
        const config = await this.loadConfig();
        return config.violations?.messages?.[key] || key;
    }

    /**
     * Get PDF configuration
     */
    async getPDFConfig() {
        const config = await this.loadConfig();
        return config.pdf || {
            defaultFormat: 'png',
            defaultBackground: 'white',
            defaultFont: 'Arial'
        };
    }

    /**
     * Get default configuration (fallback)
     */
    _getDefaultConfig() {
        return {
            app: {
                title: 'Vioverse V3',
                subtitle: 'Enterprise Credit Report Violation Analysis System'
            },
            nav: ['Dashboard', 'Evidence', 'Timeline', 'Reports'],
            labels: {
                search: 'Search evidence',
                upload: 'Upload PDF',
                loading: 'Loading...',
                error: 'An error occurred'
            },
            violations: {
                severities: ['extreme', 'severe', 'serious', 'minor', 'unknown'],
                bureaus: ['TU', 'EQ', 'EX', 'UNKNOWN'],
                messages: {
                    noViolations: 'No Violations Found',
                    noPdfError: 'No PDF or canvas set',
                    unknownType: 'unknown'
                }
            },
            pdf: {
                defaultFormat: 'png',
                defaultBackground: 'white',
                defaultFont: 'Arial'
            },
            elements: {
                ids: {}
            }
        };
    }
}

// Export singleton instance
export const configLoader = new ConfigLoader();

// Export convenience functions
export async function getUIConfig() {
    return configLoader.loadConfig();
}

export async function getUIText(path, defaultValue) {
    return configLoader.get(path, defaultValue);
}

export async function getSeverities() {
    return configLoader.getSeverities();
}

export async function getBureaus() {
    return configLoader.getBureaus();
}

// Initialize on module load
if (typeof window !== 'undefined') {
    configLoader.loadConfig().catch(console.error);
}