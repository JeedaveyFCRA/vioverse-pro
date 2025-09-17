'use client';

import { useEffect, useState } from 'react';

// Breakpoints matching Tailwind defaults
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

type Breakpoint = keyof typeof breakpoints;

interface ResponsiveState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: Breakpoint | 'xs';
  orientation: 'portrait' | 'landscape';
}

/**
 * Hook to get responsive information about the viewport
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 0,
        height: 0,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'xs',
        orientation: 'portrait',
      };
    }

    return getResponsiveState();
  });

  useEffect(() => {
    const handleResize = () => {
      setState(getResponsiveState());
    };

    // Update on mount
    handleResize();

    // Debounce resize events
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return state;
}

/**
 * Get current responsive state
 */
function getResponsiveState(): ResponsiveState {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Determine breakpoint
  let breakpoint: Breakpoint | 'xs' = 'xs';
  for (const [key, value] of Object.entries(breakpoints)) {
    if (width >= value) {
      breakpoint = key as Breakpoint;
    }
  }

  return {
    width,
    height,
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
    breakpoint,
    orientation: width > height ? 'landscape' : 'portrait',
  };
}

/**
 * Hook to check if viewport matches a media query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Update on mount
    setMatches(mediaQuery.matches);

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Use addEventListener for modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }

    // Fallback for older browsers
    mediaQuery.addListener(handler);
    return () => mediaQuery.removeListener(handler);
  }, [query]);

  return matches;
}

/**
 * Hook to detect if the user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Hook to detect if the user prefers dark mode
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Hook to detect if the device has touch capability
 */
export function useHasTouch(): boolean {
  const [hasTouch, setHasTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setHasTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return hasTouch;
}

/**
 * Hook to detect if the device is in portrait or landscape orientation
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    if (typeof window === 'undefined') return 'portrait';
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  });

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(
        window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      );
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return orientation;
}