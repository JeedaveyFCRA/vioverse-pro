import { test, expect, devices } from '@playwright/test';

const BASE_URL = process.env['E2E_BASE_URL'] || 'http://localhost:3000';

// Common mobile devices
const mobileDevices = [
  { ...devices['iPhone 12'], name: 'iPhone 12' },
  { ...devices['iPhone SE'], name: 'iPhone SE' },
  { ...devices['Pixel 5'], name: 'Pixel 5' },
  { ...devices['Galaxy S9+'], name: 'Galaxy S9+' },
  { ...devices['iPad'], name: 'iPad' },
  { ...devices['iPad Mini'], name: 'iPad Mini' },
];

test.describe('Mobile-First Tests', () => {
  for (const device of mobileDevices) {
    test.describe(`${device.name}`, () => {
      test.use(device);

      test('renders correctly without horizontal scroll', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Check for horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() => {
          const body = document.body;
          const html = document.documentElement;
          return body.scrollWidth > body.clientWidth ||
                 html.scrollWidth > html.clientWidth;
        });

        expect(hasHorizontalScroll).toBe(false);
      });

      test('touch interactions work properly', async ({ page }) => {
        await page.goto(BASE_URL);

        // Find all clickable elements
        const clickables = await page.$$('button, a, [role="button"]');

        for (const element of clickables.slice(0, 5)) {
          if (await element.isVisible()) {
            // Simulate touch tap
            await element.tap().catch(() => {
              // Some elements might navigate away, that's ok
            });
          }
        }
      });

      test('viewport meta tag is correct', async ({ page }) => {
        await page.goto(BASE_URL);

        const viewportContent = await page.$eval(
          'meta[name="viewport"]',
          el => el.getAttribute('content')
        );

        expect(viewportContent).toContain('width=device-width');
        expect(viewportContent).toContain('initial-scale=1');
      });

      test('text is readable without zooming', async ({ page }) => {
        await page.goto(BASE_URL);

        // Check that text doesn't require zooming
        const needsZoom = await page.evaluate(() => {
          const texts = document.querySelectorAll('p, span, a, button');
          let tooSmall = 0;

          texts.forEach(el => {
            const fontSize = parseFloat(window.getComputedStyle(el).fontSize);
            if (fontSize < 12) tooSmall++;
          });

          return tooSmall > texts.length * 0.1; // More than 10% too small
        });

        expect(needsZoom).toBe(false);
      });

      test('forms are usable on mobile', async ({ page }) => {
        await page.goto(BASE_URL);

        const inputs = await page.$$('input, select, textarea');

        for (const input of inputs.slice(0, 3)) {
          if (await input.isVisible()) {
            const box = await input.boundingBox();

            if (box) {
              // Input should be at least 44px tall for touch
              expect(box.height).toBeGreaterThanOrEqual(44);

              // Should be focusable
              await input.focus();
              const isFocused = await input.evaluate(el => el === document.activeElement);
              expect(isFocused).toBe(true);
            }
          }
        }
      });
    });
  }

  test('swipe gestures are supported where applicable', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      hasTouch: true,
    });

    const page = await context.newPage();
    await page.goto(BASE_URL);

    // Check for swipeable elements (carousels, galleries, etc.)
    const swipeables = await page.$$('[class*="swipe"], [class*="carousel"], [class*="slider"]');

    for (const element of swipeables) {
      if (await element.isVisible()) {
        const box = await element.boundingBox();
        if (box) {
          // Simulate swipe
          await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 });
          await page.mouse.up();
        }
      }
    }

    await context.close();
  });

  test('mobile menu/hamburger works correctly', async ({ browser }) => {
    const context = await browser.newContext(devices['iPhone 12']);
    const page = await context.newPage();
    await page.goto(BASE_URL);

    // Look for hamburger menu
    const hamburger = await page.$('[aria-label*="menu"], [class*="hamburger"], [class*="menu-toggle"], button[aria-expanded]');

    if (hamburger && await hamburger.isVisible()) {
      // Click hamburger
      await hamburger.click();
      await page.waitForTimeout(300); // Wait for animation

      // Check if menu opened
      const menuVisible = await page.$eval(
        'nav, [role="navigation"], [class*="menu"]',
        el => window.getComputedStyle(el).display !== 'none'
      ).catch(() => false);

      expect(menuVisible).toBe(true);

      // Click hamburger again to close
      await hamburger.click();
      await page.waitForTimeout(300);
    }

    await context.close();
  });

  test('pinch-to-zoom is not disabled', async ({ browser }) => {
    const context = await browser.newContext(devices['iPhone 12']);
    const page = await context.newPage();
    await page.goto(BASE_URL);

    const viewportContent = await page.$eval(
      'meta[name="viewport"]',
      el => el.getAttribute('content')
    );

    // Check that zoom is not disabled
    expect(viewportContent).not.toContain('maximum-scale=1');
    expect(viewportContent).not.toContain('user-scalable=no');
    expect(viewportContent).not.toContain('user-scalable=0');

    await context.close();
  });

  test('mobile performance metrics are acceptable', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      // Simulate 3G network
      offline: false,
    });

    const page = await context.newPage();

    // Throttle CPU and network like mobile
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: ((1.6 * 1024 * 1024) / 8), // 1.6 Mbps
      uploadThroughput: ((750 * 1024) / 8), // 750 kbps
      latency: 150, // 150ms RTT
    });

    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    const startTime = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - startTime;

    // Should load reasonably fast even on slow connection
    expect(loadTime).toBeLessThan(10000); // 10 seconds max

    // Check FCP
    const fcp = await page.evaluate(() => {
      const entry = performance.getEntriesByName(window.location.href)[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint');
      return paint ? paint.startTime : null;
    });

    if (fcp) {
      expect(fcp).toBeLessThan(3000); // FCP under 3s on mobile
    }

    await context.close();
  });
});

test.describe('Touch Target Tests', () => {
  test.use(devices['iPhone 12']);

  test('all interactive elements meet minimum touch target size', async ({ page }) => {
    await page.goto(BASE_URL);

    const interactiveElements = await page.$$('button, a, input, select, textarea, [role="button"], [onclick], [tabindex]:not([tabindex="-1"])');

    const violations: string[] = [];

    for (const element of interactiveElements) {
      if (await element.isVisible()) {
        const box = await element.boundingBox();
        if (box) {
          // WCAG 2.5.5 minimum: 44x44 CSS pixels
          if (box.width < 44 || box.height < 44) {
            const tagName = await element.evaluate(el => el.tagName.toLowerCase());
            const text = await element.textContent();
            violations.push(`${tagName}: ${text?.substring(0, 30)} (${box.width}x${box.height})`);
          }
        }
      }
    }

    // Log violations for debugging
    if (violations.length > 0) {
      console.log('Touch target violations:', violations);
    }

    expect(violations.length).toBe(0);
  });

  test('touch targets have adequate spacing', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check spacing between adjacent touch targets
    const hasAdequateSpacing = await page.evaluate(() => {
      const targets = Array.from(document.querySelectorAll('button, a, [role="button"]'));

      for (let i = 0; i < targets.length - 1; i++) {
        const rect1 = targets[i].getBoundingClientRect();
        const rect2 = targets[i + 1].getBoundingClientRect();

        // Calculate minimum distance between elements
        const horizontalGap = Math.max(0, rect2.left - (rect1.left + rect1.width));
        const verticalGap = Math.max(0, rect2.top - (rect1.top + rect1.height));

        // If elements are adjacent (not stacked), check spacing
        if (horizontalGap < 100 && verticalGap < 8) {
          return false; // Inadequate spacing
        }
      }

      return true;
    });

    expect(hasAdequateSpacing).toBe(true);
  });
});

test.describe('Responsive Images', () => {
  test('images have appropriate srcset for different resolutions', async ({ page }) => {
    await page.goto(BASE_URL);

    const images = await page.$$('img');

    for (const img of images) {
      if (await img.isVisible()) {
        const srcset = await img.getAttribute('srcset');
        const sizes = await img.getAttribute('sizes');
        const loading = await img.getAttribute('loading');

        // Should have responsive attributes
        const isOptimized = srcset || loading === 'lazy';
        expect(isOptimized).toBeTruthy();

        // Check aspect ratio is maintained
        const naturalSize = await img.evaluate((el: HTMLImageElement) => ({
          naturalWidth: el.naturalWidth,
          naturalHeight: el.naturalHeight,
          displayWidth: el.clientWidth,
          displayHeight: el.clientHeight,
        }));

        if (naturalSize.naturalWidth && naturalSize.displayWidth) {
          const naturalRatio = naturalSize.naturalWidth / naturalSize.naturalHeight;
          const displayRatio = naturalSize.displayWidth / naturalSize.displayHeight;

          // Aspect ratios should match (within 5% tolerance)
          expect(Math.abs(naturalRatio - displayRatio)).toBeLessThan(naturalRatio * 0.05);
        }
      }
    }
  });

  test('images load appropriate size for viewport', async ({ page }) => {
    // Test on mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    const mobileImages = await page.$$eval('img', imgs =>
      imgs.map(img => ({
        src: img.currentSrc || img.src,
        width: img.clientWidth,
      }))
    );

    // Test on desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL);

    const desktopImages = await page.$$eval('img', imgs =>
      imgs.map(img => ({
        src: img.currentSrc || img.src,
        width: img.clientWidth,
      }))
    );

    // If images have different sources, they should be optimized for viewport
    mobileImages.forEach((mobileImg, index) => {
      const desktopImg = desktopImages[index];
      if (desktopImg && mobileImg.width !== desktopImg.width) {
        // Different sizes might load different images
        expect(mobileImg.width).toBeLessThan(desktopImg.width);
      }
    });
  });
});