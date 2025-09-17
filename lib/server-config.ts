import { cache } from 'react';
import { configLoader, type VioboxConfig } from './config';

/**
 * Cached config loader for Server Components
 * Uses React cache to dedupe requests within a single render
 */
export const getServerConfig = cache(async (): Promise<VioboxConfig> => {
  return configLoader.loadConfig();
});

/**
 * Get specific config section in Server Components
 */
export const getServerConfigSection = cache(async <K extends keyof VioboxConfig>(
  section: K
): Promise<VioboxConfig[K]> => {
  const config = await getServerConfig();
  return config[section];
});

/**
 * Get UI text in Server Components
 */
export const getServerUIText = cache(async (path: string): Promise<string> => {
  return configLoader.getUIText(path);
});

/**
 * Check feature flag in Server Components
 */
export const isServerFeatureEnabled = cache(async (feature: string): Promise<boolean> => {
  return configLoader.isFeatureEnabled(feature);
});

/**
 * Get severity level in Server Components
 */
export const getServerSeverityLevel = cache(async (level: string) => {
  return configLoader.getSeverityLevel(level);
});