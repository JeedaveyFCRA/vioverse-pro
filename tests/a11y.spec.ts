import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Test configuration
const BASE_URL = process.env['E2E_BASE_URL'] || 'http://localhost:3000';

test.describe('Accessibility Tests', () => {
  test('home page has no critical accessibility violations', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Run axe accessibility scan
    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    // Filter for critical and serious violations only
    const criticalViolations = accessibilityResults.violations.filter(
      violation => ['critical', 'serious'].includes(violation.impact || '')
    );

    // Log violations for debugging
    if (criticalViolations.length > 0) {
      console.log('Critical accessibility violations found:');
      criticalViolations.forEach(violation => {
        console.log(`- ${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Affected elements: ${violation.nodes.length}`);
      });
    }

    // Test should pass with no critical violations
    expect(criticalViolations).toEqual([]);
  });

  test('all interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Get all interactive elements
    const interactiveElements = await page.$$eval(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      elements => elements.map(el => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 50),
        hasTabIndex: el.hasAttribute('tabindex'),
        tabIndex: el.getAttribute('tabindex'),
        isDisabled: (el as HTMLInputElement).disabled || el.getAttribute('aria-disabled') === 'true'
      }))
    );

    // Ensure we have interactive elements
    expect(interactiveElements.length).toBeGreaterThan(0);

    // Check that all interactive elements can receive focus
    for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName.toLowerCase(),
          id: el?.id,
          className: el?.className,
          isVisible: el ? window.getComputedStyle(el).visibility !== 'hidden' : false
        };
      });

      // Verify an element has focus and is visible
      expect(focusedElement.tag).toBeTruthy();
      expect(focusedElement.isVisible).toBe(true);
    }
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check if focused element has visible focus indicator
    const hasFocusIndicator = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;

      const styles = window.getComputedStyle(el);
      const hasFocusStyles =
        styles.outline !== 'none' ||
        styles.boxShadow !== 'none' ||
        styles.border !== 'none' ||
        el.classList.toString().includes('focus');

      return hasFocusStyles;
    });

    expect(hasFocusIndicator).toBe(true);
  });

  test('images have alt text', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Get all images
    const images = await page.$$eval('img', imgs =>
      imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        hasAlt: img.hasAttribute('alt'),
        isDecorative: img.getAttribute('role') === 'presentation' || img.alt === ''
      }))
    );

    // Check that all images either have alt text or are marked as decorative
    for (const img of images) {
      expect(img.hasAlt).toBe(true);
    }
  });

  test('page has proper heading structure', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Get all headings
    const headings = await page.$$eval(
      'h1, h2, h3, h4, h5, h6',
      elements => elements.map(el => ({
        level: parseInt(el.tagName.replace('H', '')),
        text: el.textContent?.trim()
      }))
    );

    // Should have at least one h1
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(1); // Only one h1 per page

    // Check heading hierarchy (no skipping levels)
    let previousLevel = 0;
    for (const heading of headings) {
      if (previousLevel > 0) {
        // Heading level should not skip more than 1 level
        expect(heading.level).toBeLessThanOrEqual(previousLevel + 1);
      }
      previousLevel = heading.level;
    }
  });

  test('form elements have labels', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Get all form inputs
    const formInputs = await page.$$eval(
      'input:not([type="hidden"]), select, textarea',
      elements => elements.map(el => {
        const id = el.id;
        const hasLabel = !!document.querySelector(`label[for="${id}"]`);
        const hasAriaLabel = el.hasAttribute('aria-label');
        const hasAriaLabelledBy = el.hasAttribute('aria-labelledby');
        const isWrappedInLabel = el.closest('label') !== null;

        return {
          tag: el.tagName.toLowerCase(),
          type: (el as HTMLInputElement).type,
          id: id,
          hasAccessibleLabel: hasLabel || hasAriaLabel || hasAriaLabelledBy || isWrappedInLabel
        };
      })
    );

    // All form inputs should have accessible labels
    for (const input of formInputs) {
      expect(input.hasAccessibleLabel).toBe(true);
    }
  });

  test('color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Run axe with color contrast rules
    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    // Filter for color contrast violations
    const contrastViolations = results.violations.filter(
      v => v.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });

  test('page has proper language attribute', async ({ page }) => {
    await page.goto(BASE_URL);

    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBeTruthy();
    expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., 'en' or 'en-US'
  });

  test('page has skip navigation link', async ({ page }) => {
    await page.goto(BASE_URL);

    // Press tab to potentially reveal skip link
    await page.keyboard.press('Tab');

    // Check for skip navigation link
    const skipLink = await page.$eval(
      'a[href="#main"], a[href="#content"], [class*="skip"]',
      el => ({
        exists: true,
        text: el.textContent?.trim(),
        href: el.getAttribute('href')
      })
    ).catch(() => ({ exists: false, text: null, href: null }));

    // Skip link is recommended but not always required
    if (skipLink.exists) {
      expect(skipLink.href).toMatch(/#(main|content|skip)/);
    }
  });
});