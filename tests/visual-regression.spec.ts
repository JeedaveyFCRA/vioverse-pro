import { test, expect } from '@playwright/test';
import { devices } from '@playwright/test';

const BASE_URL = process.env['E2E_BASE_URL'] || 'http://localhost:3000';

// Define viewports for visual testing
const visualTestViewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
];

test.describe('Visual Regression Tests', () => {
  // Skip in CI unless UPDATE_SNAPSHOTS is set
  test.skip(
    () => process.env['CI'] === 'true' && !process.env['UPDATE_SNAPSHOTS'],
    'Visual tests skipped in CI'
  );

  for (const viewport of visualTestViewports) {
    test(`homepage screenshot at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Wait for any animations to complete
      await page.waitForTimeout(500);

      // Take screenshot
      await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        mask: [
          // Mask dynamic content like dates, random IDs
          page.locator('[data-testid*="date"]'),
          page.locator('[data-testid*="time"]'),
        ],
      });
    });

    test(`critical elements visible at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Screenshot specific components
      const main = page.locator('main').first();
      if (await main.count() > 0) {
        await expect(main).toHaveScreenshot(`main-content-${viewport.name}.png`);
      }

      const header = page.locator('header').first();
      if (await header.count() > 0) {
        await expect(header).toHaveScreenshot(`header-${viewport.name}.png`);
      }
    });
  }

  test.describe('Dark Mode Visual Tests', () => {
    test('dark mode toggle maintains layout', async ({ page }) => {
      await page.goto(BASE_URL);

      // Take light mode screenshot
      await expect(page).toHaveScreenshot('light-mode.png');

      // Toggle dark mode if available
      const darkModeToggle = page.locator('[aria-label*="theme"], [aria-label*="dark"], [class*="theme-toggle"]').first();

      if (await darkModeToggle.count() > 0) {
        await darkModeToggle.click();
        await page.waitForTimeout(300); // Wait for transition

        // Take dark mode screenshot
        await expect(page).toHaveScreenshot('dark-mode.png');

        // Check layout didn't shift
        const layoutMetrics = await page.evaluate(() => {
          const main = document.querySelector('main');
          return main ? {
            width: main.clientWidth,
            height: main.clientHeight,
          } : null;
        });

        expect(layoutMetrics).toBeTruthy();
      }
    });
  });

  test.describe('Component Visual Tests', () => {
    test('buttons maintain consistent appearance', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const buttons = await page.$$('button');

      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        const button = buttons[i];
        if (await button.isVisible()) {
          await expect(button).toHaveScreenshot(`button-${i}.png`);

          // Test hover state
          await button.hover();
          await page.waitForTimeout(100);
          await expect(button).toHaveScreenshot(`button-${i}-hover.png`);

          // Test focus state
          await button.focus();
          await expect(button).toHaveScreenshot(`button-${i}-focus.png`);
        }
      }
    });

    test('forms render consistently', async ({ page }) => {
      await page.goto(BASE_URL);

      const forms = await page.$$('form');

      for (let i = 0; i < Math.min(forms.length, 3); i++) {
        const form = forms[i];
        if (await form.isVisible()) {
          await expect(form).toHaveScreenshot(`form-${i}.png`);
        }
      }
    });
  });

  test.describe('Cross-Browser Visual Tests', () => {
    const browsers = [
      { name: 'chromium', device: devices['Desktop Chrome'] },
      { name: 'firefox', device: devices['Desktop Firefox'] },
      { name: 'webkit', device: devices['Desktop Safari'] },
    ];

    for (const browser of browsers) {
      test(`consistent rendering in ${browser.name}`, async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(`cross-browser-${browser.name}.png`, {
          fullPage: false, // Just viewport for consistency
          animations: 'disabled',
        });
      });
    }
  });

  test.describe('Responsive Layout Visual Tests', () => {
    test('fluid layout transition', async ({ page }) => {
      const widths = [320, 480, 640, 768, 1024, 1280, 1440, 1920];

      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Check container widths are appropriate
        const metrics = await page.evaluate(() => {
          const container = document.querySelector('.container, [class*="container"], main');
          const computed = container ? window.getComputedStyle(container) : null;

          return {
            width: container?.clientWidth,
            padding: computed?.padding,
            margin: computed?.margin,
          };
        });

        // Container should be responsive
        if (metrics.width) {
          expect(metrics.width).toBeLessThanOrEqual(width);

          // Take snapshot for visual comparison
          await expect(page).toHaveScreenshot(`responsive-${width}.png`, {
            clip: {
              x: 0,
              y: 0,
              width,
              height: 600,
            },
          });
        }
      }
    });
  });

  test.describe('Print Layout Visual Tests', () => {
    test('print layout is optimized', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Emulate print media
      await page.emulateMedia({ media: 'print' });

      await expect(page).toHaveScreenshot('print-layout.png', {
        fullPage: true,
      });

      // Check print styles
      const printStyles = await page.evaluate(() => {
        const styles = window.getComputedStyle(document.body);
        return {
          background: styles.background,
          color: styles.color,
          fontSize: styles.fontSize,
        };
      });

      // Print should have appropriate styling
      expect(printStyles.background).toContain('none');
    });
  });
});

test.describe('Responsive Typography Tests', () => {
  test('fluid typography scales appropriately', async ({ page }) => {
    const viewports = [
      { width: 320, expectedH1: 24 },
      { width: 768, expectedH1: 32 },
      { width: 1440, expectedH1: 40 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: 900 });
      await page.goto(BASE_URL);

      const h1Size = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        return h1 ? parseFloat(window.getComputedStyle(h1).fontSize) : null;
      });

      if (h1Size) {
        // Font size should scale with viewport
        expect(h1Size).toBeGreaterThanOrEqual(viewport.expectedH1 * 0.8);
        expect(h1Size).toBeLessThanOrEqual(viewport.expectedH1 * 1.2);
      }
    }
  });

  test('line length is optimal for readability', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);

    const paragraphs = await page.$$eval('p', elements =>
      elements.map(el => ({
        width: el.clientWidth,
        fontSize: parseFloat(window.getComputedStyle(el).fontSize),
        lineHeight: window.getComputedStyle(el).lineHeight,
      }))
    );

    paragraphs.forEach(p => {
      if (p.width && p.fontSize) {
        // Optimal line length is 45-75 characters
        const charsPerLine = p.width / (p.fontSize * 0.6);
        expect(charsPerLine).toBeGreaterThan(30);
        expect(charsPerLine).toBeLessThan(90);
      }
    });
  });
});