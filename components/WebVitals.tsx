'use client';

import { useEffect } from 'react';

type MetricType = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
};

export function WebVitals() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reportWebVitals = async () => {
      try {
        const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

        const logMetric = (metric: MetricType) => {
          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`[Web Vitals] ${metric.name}:`, {
              value: metric.value,
              rating: metric.rating,
              delta: metric.delta,
              navigationType: metric.navigationType,
            });
          }

          // Send to analytics service in production
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', metric.name, {
              value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
              metric_rating: metric.rating,
              metric_delta: metric.delta,
              non_interaction: true,
            });
          }
        };

        // Collect all Web Vitals metrics
        onCLS(logMetric);
        onFCP(logMetric);
        onLCP(logMetric);
        onTTFB(logMetric);
        onINP(logMetric);
      } catch (error) {
        console.error('Failed to load web-vitals:', error);
      }
    };

    reportWebVitals();
  }, []);

  return null;
}

// Optional: Export a hook for custom usage
export function useWebVitals(callback?: (metric: MetricType) => void) {
  useEffect(() => {
    if (!callback || typeof window === 'undefined') return;

    const reportWebVitals = async () => {
      try {
        const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

        onCLS(callback);
        onFCP(callback);
        onLCP(callback);
        onTTFB(callback);
        onINP(callback);
      } catch (error) {
        console.error('Failed to load web-vitals:', error);
      }
    };

    reportWebVitals();
  }, [callback]);
}