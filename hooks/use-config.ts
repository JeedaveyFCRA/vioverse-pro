'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { VioboxConfig } from '@/lib/config';

const CONFIG_QUERY_KEY = ['config'];

/**
 * Fetch configuration from API
 */
async function fetchConfig(): Promise<VioboxConfig> {
  const response = await fetch('/api/config');
  if (!response.ok) {
    throw new Error('Failed to fetch configuration');
  }
  return response.json();
}

/**
 * Hook to access configuration in client components
 */
export function useConfig() {
  return useQuery({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: fetchConfig,
    staleTime: Infinity, // Config rarely changes
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook to access specific config section
 */
export function useConfigSection<K extends keyof VioboxConfig>(section: K) {
  const { data, ...rest } = useConfig();
  return {
    data: data?.[section],
    ...rest
  };
}

/**
 * Hook to access UI text
 */
export function useUIText(path: string): string {
  const { data } = useConfig();

  if (!data?.ui) {
    return path; // Return path as fallback
  }

  const parts = path.split('.');
  let value: any = data.ui;

  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) {
      return path; // Return path as fallback
    }
  }

  return String(value);
}

/**
 * Hook to check feature flags
 */
export function useFeature(feature: string): boolean {
  const { data } = useConfig();

  if (!data?.features) {
    return false;
  }

  const flag = data.features[feature];

  if (typeof flag === 'boolean') {
    return flag;
  } else if (typeof flag === 'object' && 'enabled' in flag) {
    return flag.enabled;
  }

  return false;
}

/**
 * Hook to get severity level configuration
 */
export function useSeverityLevel(level: string) {
  const { data } = useConfig();

  if (!data?.severity) {
    return null;
  }

  return data.severity.severityLevels[level] || data.severity.severityLevels['unknown'];
}

/**
 * Hook to get theme colors
 */
export function useThemeColors() {
  const { data } = useConfig();
  return data?.theme?.colors;
}

/**
 * Hook to get responsive breakpoints
 */
export function useBreakpoints() {
  const { data } = useConfig();
  return data?.breakpoints;
}

/**
 * Hook to invalidate config cache (force refresh)
 */
export function useInvalidateConfig() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: CONFIG_QUERY_KEY });
  };
}