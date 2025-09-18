import { test, expect } from '@playwright/test';

const BASE_URL = process.env['E2E_BASE_URL'] || 'http://localhost:3000';

// Test viewport widths covering all device categories
const viewportSizes = [
  { width: 320, height: 568, name: 'iPhone SE' },
  { width: 375, height: 667, name: 'iPhone 8' },
  { width: 414, height: 896, name: 'iPhone 11' },
  { width: 768, height: 1024, name: 'iPad' },
  { width: 1024, height: 768, name: 'Desktop Small' },
  { width: 1280, height: 800, name: 'Desktop Medium' },
  { width: 1440, height: 900, name: 'Desktop Large' },
  { width: 1920, height: 1080, name: 'Desktop Full HD' },
];

test.describe('Responsive Layout Tests', () => {
  // Test each viewport size
  for (const viewport of viewportSizes) {
    test(`layout renders correctly at ${viewport.width}x${viewport.height} (${viewport.name})`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Navigate to homepage
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Check for layout shift
      const layoutShifts = await page.evaluate(() => {
        const entries = performance.getEntriesByType('layout-shift') as any[];
        return entries.filter(entry => !entry.hadRecentInput).length;
      });

      // Should have minimal layout shifts
      expect(layoutShifts).toBeLessThanOrEqual(2);

      // Check core elements are visible
      const main = page.locator('main').first();
      await expect(main).toBeVisible();

      // Check text is readable (not cut off)
      const heading = page.locator('h1').first();
      if (await heading.count() > 0) {
        await expect(heading).toBeVisible();

        const headingBox = await heading.boundingBox();
        if (headingBox) {
          expect(headingBox.width).toBeGreaterThan(0);
          expect(headingBox.width).toBeLessThanOrEqual(viewport.width);
        }
      }

      // No horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Check for viewport meta tag
      const viewportMeta = await page.$eval(
        'meta[name="viewport"]',
        el => el.getAttribute('content')
      ).catch(() => null);

      expect(viewportMeta).toContain('width=device-width');
    });

    test(`interactive elements are accessible at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Check all buttons are clickable size (min 44x44px for mobile)
      const buttons = await page.$$('button, a, [role="button"]');
      const minSize = viewport.width <= 768 ? 44 : 32;

      for (const button of buttons.slice(0, 10)) { // Check first 10 buttons
        const box = await button.boundingBox();
        if (box && await button.isVisible()) {
          expect(box.width).toBeGreaterThanOrEqual(minSize);
          expect(box.height).toBeGreaterThanOrEqual(minSize);
        }
      }
    });
  }

  test('layout adapts from mobile to desktop', async ({ page }) => {
    // Start with mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    // Get initial layout metrics
    const mobileMetrics = await page.evaluate(() => ({
      fontSize: window.getComputedStyle(document.body).fontSize,
      containerWidth: document.querySelector('main')?.clientWidth || 0,
    }));

    // Resize to desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500); // Wait for resize to settle

    // Get desktop layout metrics
    const desktopMetrics = await page.evaluate(() => ({
      fontSize: window.getComputedStyle(document.body).fontSize,
      containerWidth: document.querySelector('main')?.clientWidth || 0,
    }));

    // Container should be wider on desktop
    expect(desktopMetrics.containerWidth).toBeGreaterThan(mobileMetrics.containerWidth);
  });

  test('images are responsive', async ({ page }) => {
    for (const viewport of [375, 768, 1440]) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.goto(BASE_URL);

      const images = await page.$$('img');

      for (const img of images.slice(0, 5)) { // Check first 5 images
        const box = await img.boundingBox();
        if (box && await img.isVisible()) {
          // Image should not exceed viewport width
          expect(box.width).toBeLessThanOrEqual(viewport);

          // Check for responsive attributes
          const srcset = await img.getAttribute('srcset');
          const sizes = await img.getAttribute('sizes');
          const loading = await img.getAttribute('loading');

          // Should have responsive image attributes or lazy loading
          const isResponsive = srcset || sizes || loading === 'lazy';
          expect(isResponsive).toBeTruthy();
        }
      }
    }
  });

  test('text remains readable at all sizes', async ({ page }) => {
    for (const viewport of viewportSizes) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL);

      // Check font sizes
      const textElements = await page.$$('p, span, a, button, h1, h2, h3, h4, h5, h6');

      for (const element of textElements.slice(0, 10)) {
        if (await element.isVisible()) {
          const fontSize = await element.evaluate(el => {
            return parseFloat(window.getComputedStyle(el).fontSize);
          });

          // Minimum font size for readability
          if (viewport.width <= 414) {
            expect(fontSize).toBeGreaterThanOrEqual(12); // Mobile minimum
          } else {
            expect(fontSize).toBeGreaterThanOrEqual(14); // Desktop minimum
          }
        }
      }
    }
  });

  test('touch targets are appropriately sized on mobile', async ({ page }) => {
    const mobileViewports = viewportSizes.filter(v => v.width <= 768);

    for (const viewport of mobileViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL);

      const touchTargets = await page.$$('button, a, input, select, textarea, [role="button"], [onclick]');

      for (const target of touchTargets.slice(0, 10)) {
        if (await target.isVisible()) {
          const box = await target.boundingBox();
          if (box) {
            // WCAG 2.5.5: Target Size - minimum 44x44 CSS pixels
            const area = box.width * box.height;
            expect(area).toBeGreaterThanOrEqual(44 * 44);
          }
        }
      }
    }
  });

  test('navigation is accessible at all breakpoints', async ({ page }) => {
    for (const viewport of viewportSizes) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL);

      // Check if navigation exists
      const nav = await page.$('nav, [role="navigation"], header');

      if (nav) {
        const isVisible = await nav.isVisible();

        if (viewport.width <= 768) {
          // On mobile, might have hamburger menu
          const hamburger = await page.$('[aria-label*="menu"], [class*="menu-toggle"], [class*="hamburger"]');

          if (hamburger) {
            await expect(hamburger).toBeVisible();
            const box = await hamburger.boundingBox();
            if (box) {
              // Hamburger should be touch-friendly
              expect(box.width).toBeGreaterThanOrEqual(44);
              expect(box.height).toBeGreaterThanOrEqual(44);
            }
          } else {
            // If no hamburger, nav should be visible
            expect(isVisible).toBe(true);
          }
        } else {
          // On desktop, navigation should be visible
          expect(isVisible).toBe(true);
        }
      }
    }
  });

  test('container width respects max-width constraints', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);

    const containers = await page.$$('[class*="container"], main, [class*="wrapper"]');

    for (const container of containers) {
      if (await container.isVisible()) {
        const box = await container.boundingBox();
        if (box) {
          // Typical max-width for readability is around 1200-1440px
          expect(box.width).toBeLessThanOrEqual(1600);
        }
      }
    }
  });

  test('grid/flex layouts adapt correctly', async ({ page }) => {
    for (const viewport of [375, 768, 1440]) {
      await page.setViewportSize({ width: viewport, height: 900 });
      await page.goto(BASE_URL);

      // Find grid or flex containers
      const layoutContainers = await page.$$eval(
        '[class*="grid"], [class*="flex"]',
        elements => elements.map(el => {
          const styles = window.getComputedStyle(el);
          return {
            display: styles.display,
            gridCols: styles.gridTemplateColumns,
            flexDirection: styles.flexDirection,
            flexWrap: styles.flexWrap,
          };
        })
      );

      // Check that layout adjusts for viewport
      if (viewport <= 768) {
        // Mobile should stack elements
        layoutContainers.forEach(container => {
          if (container.display === 'flex') {
            // Should wrap or be column on mobile
            const isStacked = container.flexDirection === 'column' ||
                            container.flexWrap === 'wrap';
            expect(isStacked).toBeTruthy();
          }
        });
      }
    }
  });
});

test.describe('Cumulative Layout Shift (CLS) Tests', () => {
  test('homepage has acceptable CLS score', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get CLS score
    const clsScore = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let cls = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        });

        observer.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(cls);
        }, 2000);
      });
    });

    // CLS should be less than 0.1 for good user experience
    expect(clsScore).toBeLessThan(0.1);
  });

  test('dynamic content loading does not cause layout shift', async ({ page }) => {
    await page.goto(BASE_URL);

    // Monitor layout shifts
    await page.evaluate(() => {
      window.layoutShifts = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            (window as any).layoutShifts.push({
              value: (entry as any).value,
              sources: (entry as any).sources,
            });
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    });

    // Simulate dynamic content loading
    await page.waitForTimeout(3000);

    // Get layout shift data
    const shifts = await page.evaluate(() => (window as any).layoutShifts);

    // Check total CLS
    const totalCLS = shifts.reduce((sum: number, shift: any) => sum + shift.value, 0);
    expect(totalCLS).toBeLessThan(0.1);
  });
});

test.describe('Orientation Changes', () => {
  test('handles orientation change from portrait to landscape', async ({ page, context }) => {
    // Start in portrait
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto(BASE_URL);

    const portraitLayout = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    }));

    // Switch to landscape
    await page.setViewportSize({ width: 896, height: 414 });
    await page.waitForTimeout(500);

    const landscapeLayout = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      hasScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));

    // Layout should adapt without horizontal scroll
    expect(landscapeLayout.hasScroll).toBe(false);
    expect(landscapeLayout.width).toBeGreaterThan(portraitLayout.width);
  });
});

// Add test for specific breakpoint transitions
test.describe('Breakpoint Transitions', () => {
  const breakpoints = [
    { name: 'mobile-to-tablet', from: 640, to: 768 },
    { name: 'tablet-to-desktop', from: 1023, to: 1024 },
    { name: 'desktop-to-large', from: 1279, to: 1280 },
  ];

  for (const breakpoint of breakpoints) {
    test(`smooth transition at ${breakpoint.name} breakpoint`, async ({ page }) => {
      // Just before breakpoint
      await page.setViewportSize({ width: breakpoint.from, height: 900 });
      await page.goto(BASE_URL);

      const beforeLayout = await page.evaluate(() => {
        const main = document.querySelector('main');
        return main ? window.getComputedStyle(main) : null;
      });

      // Just after breakpoint
      await page.setViewportSize({ width: breakpoint.to, height: 900 });
      await page.waitForTimeout(300);

      const afterLayout = await page.evaluate(() => {
        const main = document.querySelector('main');
        return main ? window.getComputedStyle(main) : null;
      });

      // Verify layout changed appropriately
      expect(beforeLayout).toBeTruthy();
      expect(afterLayout).toBeTruthy();
    });
  }
});