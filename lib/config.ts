import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import {
  NavigationSchema,
  BreakpointSchema,
  ThemeSchema,
  FeatureFlagsSchema,
  type Navigation,
  type Breakpoint,
  type Theme,
  type FeatureFlags
} from '@/schemas/config.schema';

// UI Text Schema (from ui-text.json)
export const UITextSchema = z.object({
  titles: z.record(z.string()),
  buttons: z.record(z.string()),
  labels: z.record(z.string()),
  messages: z.record(z.string()),
  instructions: z.record(z.string()),
  tooltips: z.record(z.string())
});

export type UIText = z.infer<typeof UITextSchema>;

// Severity Config Schema (from severity.json)
export const SeverityConfigSchema = z.object({
  severityLevels: z.record(z.object({
    label: z.string(),
    color: z.string(),
    fillColor: z.string(),
    backgroundColor: z.string(),
    borderWidth: z.number(),
    priority: z.number(),
    badgeClass: z.string(),
    itemClass: z.string()
  }))
});

export type SeverityConfig = z.infer<typeof SeverityConfigSchema>;

// Bureau Config Schema (from bureaus.json)
export const BureauConfigSchema = z.object({
  bureaus: z.record(z.object({
    name: z.string(),
    code: z.string(),
    color: z.string(),
    enabled: z.boolean(),
    order: z.number()
  }))
});

export type BureauConfig = z.infer<typeof BureauConfigSchema>;

// Complete Config Type
export interface VioboxConfig {
  ui: UIText;
  severity: SeverityConfig;
  bureaus: BureauConfig;
  navigation: Navigation;
  breakpoints: Breakpoint;
  theme: Theme;
  features: FeatureFlags;
  defaults: Record<string, any>;
}

class ConfigLoader {
  private static instance: ConfigLoader;
  private config: VioboxConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = process.env['CONFIG_PATH'] || path.join(process.cwd(), 'data', 'config');
  }

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Load a single config file with validation
   */
  private loadConfigFile<T>(filename: string, schema: z.ZodSchema<T>): T {
    try {
      const filePath = path.join(this.configPath, filename);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Validate with Zod
      const validated = schema.parse(data);
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`Validation error in ${filename}:`, error.errors);
        throw new Error(`Invalid configuration in ${filename}: ${error.message}`);
      } else if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in ${filename}: ${error.message}`);
      } else {
        throw new Error(`Failed to load ${filename}: ${error}`);
      }
    }
  }

  /**
   * Load all configuration files
   */
  public async loadConfig(): Promise<VioboxConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      // Load individual config files
      const uiText = this.loadConfigFile('ui-text.json', UITextSchema);
      const severity = this.loadConfigFile('severity.json', SeverityConfigSchema);
      const bureaus = this.loadConfigFile('bureaus.json', BureauConfigSchema);
      const navigation = this.loadConfigFile('navigation.json', NavigationSchema);
      const breakpoints = this.loadConfigFile('breakpoints.json', BreakpointSchema);
      const theme = this.loadConfigFile('theme.json', ThemeSchema);
      const features = this.loadConfigFile('features.json', FeatureFlagsSchema);

      // Load defaults (no schema validation for flexibility)
      const defaultsPath = path.join(this.configPath, 'defaults.json');
      const defaults = fs.existsSync(defaultsPath)
        ? JSON.parse(fs.readFileSync(defaultsPath, 'utf-8'))
        : {};

      this.config = {
        ui: uiText,
        severity,
        bureaus,
        navigation,
        breakpoints,
        theme,
        features,
        defaults
      };

      return this.config;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * Get specific config section
   */
  public async getConfig<K extends keyof VioboxConfig>(
    section: K
  ): Promise<VioboxConfig[K]> {
    const config = await this.loadConfig();
    return config[section];
  }

  /**
   * Get UI text by path (e.g., "buttons.loadCSV")
   */
  public async getUIText(path: string): Promise<string> {
    const config = await this.loadConfig();
    const parts = path.split('.');
    let value: any = config.ui;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) {
        console.warn(`UI text not found for path: ${path}`);
        return path; // Return path as fallback
      }
    }

    return String(value);
  }

  /**
   * Get severity level configuration
   */
  public async getSeverityLevel(level: string) {
    const config = await this.loadConfig();
    return config.severity.severityLevels[level] || config.severity.severityLevels.unknown;
  }

  /**
   * Check if a feature is enabled
   */
  public async isFeatureEnabled(feature: string): Promise<boolean> {
    const config = await this.loadConfig();
    const flag = config.features[feature];

    if (typeof flag === 'boolean') {
      return flag;
    } else if (typeof flag === 'object' && 'enabled' in flag) {
      return flag.enabled;
    }

    return false;
  }

  /**
   * Get theme colors
   */
  public async getThemeColors() {
    const config = await this.loadConfig();
    return config.theme.colors;
  }

  /**
   * Get responsive breakpoint
   */
  public async getBreakpoint(size: keyof Breakpoint): Promise<number> {
    const config = await this.loadConfig();
    return config.breakpoints[size];
  }

  /**
   * Reload configuration (useful for hot reloading in development)
   */
  public async reloadConfig(): Promise<void> {
    this.config = null;
    await this.loadConfig();
  }

  /**
   * Watch config files for changes (development only)
   */
  public watchConfig(callback?: () => void): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const watcher = fs.watch(this.configPath, { recursive: true }, async (eventType, filename) => {
      if (filename && filename.endsWith('.json')) {
        console.log(`Config file changed: ${filename}`);
        await this.reloadConfig();
        callback?.();
      }
    });

    process.on('exit', () => watcher.close());
  }
}

// Export singleton instance
export const configLoader = ConfigLoader.getInstance();

// Export convenience functions
export async function getConfig<K extends keyof VioboxConfig>(
  section: K
): Promise<VioboxConfig[K]> {
  return configLoader.getConfig(section);
}

export async function getUIText(path: string): Promise<string> {
  return configLoader.getUIText(path);
}

export async function isFeatureEnabled(feature: string): Promise<boolean> {
  return configLoader.isFeatureEnabled(feature);
}

export async function getSeverityLevel(level: string) {
  return configLoader.getSeverityLevel(level);
}

// Initialize config on module load (for Server Components)
if (typeof window === 'undefined') {
  configLoader.loadConfig().catch(console.error);
}