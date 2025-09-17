'use client';

import { useEffect } from 'react';

/**
 * Development-only hook to check accessibility issues
 * Uses axe-core to scan for WCAG violations
 */
export function useAccessibilityCheck() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Only run in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    const runAccessibilityCheck = async () => {
      try {
        // Dynamically import axe-core only in development
        const axe = await import('axe-core');

        // Configure axe to check for WCAG 2.2 AA compliance
        axe.default.configure({
          rules: [
            {
              id: 'color-contrast',
              enabled: true,
            },
            {
              id: 'label',
              enabled: true,
            },
            {
              id: 'button-name',
              enabled: true,
            },
            {
              id: 'image-alt',
              enabled: true,
            },
          ],
        });

        // Run accessibility check
        const results = await axe.default.run(document.body, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
          },
        });

        // Log violations to console with styling
        if (results.violations.length > 0) {
          console.group(
            '%c⚠️ Accessibility Issues Detected',
            'color: orange; font-weight: bold; font-size: 14px'
          );

          results.violations.forEach((violation) => {
            console.group(
              `%c${violation.impact?.toUpperCase()}: ${violation.description}`,
              `color: ${
                violation.impact === 'critical'
                  ? 'red'
                  : violation.impact === 'serious'
                  ? 'orange'
                  : 'yellow'
              }; font-weight: bold`
            );

            console.log('Help:', violation.help);
            console.log('Learn more:', violation.helpUrl);
            console.log('Affected elements:', violation.nodes.length);

            violation.nodes.forEach((node, index) => {
              console.log(`  ${index + 1}. ${node.target.join(' ')}`);
              if (node.failureSummary) {
                console.log(`     Fix: ${node.failureSummary}`);
              }
            });

            console.groupEnd();
          });

          console.log(
            '%cRun npm run test:a11y for detailed accessibility testing',
            'color: #666; font-style: italic'
          );

          console.groupEnd();
        } else {
          console.log(
            '%c✅ No accessibility issues detected',
            'color: green; font-weight: bold'
          );
        }

        // Also check for keyboard navigation
        const interactiveElements = document.querySelectorAll(
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        let elementsWithoutFocusIndicator = 0;
        interactiveElements.forEach((element) => {
          const styles = window.getComputedStyle(element);
          const focusStyles = window.getComputedStyle(element, ':focus');

          // Check if element has focus styles
          if (
            focusStyles.outline === 'none' &&
            focusStyles.boxShadow === 'none' &&
            focusStyles.border === styles.border
          ) {
            elementsWithoutFocusIndicator++;
          }
        });

        if (elementsWithoutFocusIndicator > 0) {
          console.warn(
            `⚠️ ${elementsWithoutFocusIndicator} interactive elements may lack visible focus indicators`
          );
        }

        // Check for skip links
        const skipLink = document.querySelector('[href="#main"], [href="#content"]');
        if (!skipLink) {
          console.info('💡 Consider adding a skip navigation link for keyboard users');
        }

      } catch (error) {
        console.error('Failed to run accessibility check:', error);
      }
    };

    // Run check after a short delay to ensure DOM is ready
    const timer = setTimeout(runAccessibilityCheck, 1000);

    // Also run on route changes if using client-side routing
    const handleRouteChange = () => {
      setTimeout(runAccessibilityCheck, 500);
    };

    window.addEventListener('popstate', handleRouteChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);
}

// Export a component version for easy inclusion
export function AccessibilityChecker() {
  useAccessibilityCheck();
  return null;
}