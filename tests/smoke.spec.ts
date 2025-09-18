import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('frontend loads with assets and health', async ({ page, request, baseURL }) => {
    // Test frontend HTML loads
    const frontend = '/frontend/index.html';
    await page.goto(frontend);

    // Check main app container is visible
    const appContainer = page.locator('.main-container');
    await expect(appContainer).toBeVisible();

    // Verify critical elements
    await expect(page.locator('.top-controls')).toBeVisible();
    await expect(page.locator('#pdfCanvas')).toBeAttached();
    await expect(page.locator('.sidebar')).toBeVisible();

    // CSS assets reachable
    const cssCore = await request.get('/frontend/css/core.css');
    expect(cssCore.status()).toBe(200);
    expect(cssCore.headers()['content-type']).toContain('text/css');

    const cssLayout = await request.get('/frontend/css/layout.css');
    expect(cssLayout.status()).toBe(200);

    // JS assets reachable
    const jsApp = await request.get('/frontend/js/app.js');
    expect(jsApp.status()).toBe(200);
    expect(jsApp.headers()['content-type']).toContain('javascript');

    const jsConfigLoader = await request.get('/frontend/js/core/config-loader.js');
    expect(jsConfigLoader.status()).toBe(200);

    // Data config accessible
    const configUiText = await request.get('/frontend/data/config/ui-text.json');
    expect(configUiText.status()).toBe(200);
    const uiTextData = await configUiText.json();
    expect(uiTextData).toHaveProperty('titles');
    expect(uiTextData).toHaveProperty('buttons');

    // Health endpoint
    const health = await request.get('/api/health');
    expect(health.status()).toBe(200);
    const healthData = await health.json();
    expect(healthData).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      version: expect.any(String),
      environment: expect.any(String),
    });

    // Config endpoint
    const config = await request.get('/api/config');
    expect(config.status()).toBe(200);
    const configData = await config.json();
    expect(configData).toBeDefined();
  });

  test('bureau filters are interactive', async ({ page }) => {
    await page.goto('/frontend/index.html');

    // Wait for JS to initialize
    await page.waitForTimeout(1000);

    // Check bureau checkboxes exist and are functional
    const tuCheckbox = page.locator('#filterTU');
    const exCheckbox = page.locator('#filterEX');
    const eqCheckbox = page.locator('#filterEQ');

    // All should be checked by default
    await expect(tuCheckbox).toBeChecked();
    await expect(exCheckbox).toBeChecked();
    await expect(eqCheckbox).toBeChecked();

    // Test unchecking
    await tuCheckbox.uncheck();
    await expect(tuCheckbox).not.toBeChecked();
  });

  test('file upload controls exist', async ({ page }) => {
    await page.goto('/frontend/index.html');

    // Check CSV upload
    const csvInput = page.locator('#csvFiles');
    await expect(csvInput).toBeAttached();
    await expect(csvInput).toHaveAttribute('accept', '.csv');

    // Check PDF upload
    const pdfInput = page.locator('#pdfFiles');
    await expect(pdfInput).toBeAttached();
    await expect(pdfInput).toHaveAttribute('accept', '.pdf');

    // Check upload labels are clickable
    const csvLabel = page.locator('label[for="csvFiles"]');
    await expect(csvLabel).toBeVisible();
    await expect(csvLabel).toContainText('Load CSV');

    const pdfLabel = page.locator('label[for="pdfFiles"]');
    await expect(pdfLabel).toBeVisible();
    await expect(pdfLabel).toContainText('Load PDF');
  });

  test('responsive layout works', async ({ page }) => {
    await page.goto('/frontend/index.html');

    // Desktop view
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('.main-container')).toHaveCSS('display', 'flex');
    await expect(page.locator('.sidebar')).toBeVisible();

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Wait for CSS transitions

    // On mobile, layout should adapt
    const mainContainer = page.locator('.main-container');
    await expect(mainContainer).toBeVisible();
  });

  test('data paths are relative not absolute', async ({ request }) => {
    // Verify no absolute paths in served content
    const html = await request.get('/frontend/index.html');
    const htmlText = await html.text();

    // Check for problematic patterns
    expect(htmlText).not.toContain('file://');
    expect(htmlText).not.toContain('wsl.localhost');
    expect(htmlText).not.toContain('/home/');
    expect(htmlText).not.toContain('C:\\');

    // Verify relative paths work
    expect(htmlText).toContain('css/core.css');
    expect(htmlText).toContain('js/app.js');
  });
});

test.describe('API Security', () => {
  test('health endpoint has proper headers', async ({ request }) => {
    const response = await request.get('/api/health');

    // Check security headers
    expect(response.headers()['content-type']).toContain('application/json');
    expect(response.headers()['cache-control']).toContain('no-cache');

    // No stack traces in production
    const data = await response.json();
    expect(JSON.stringify(data)).not.toContain('Error');
    expect(JSON.stringify(data)).not.toContain('stack');
  });

  test('config endpoint has proper headers', async ({ request }) => {
    const response = await request.get('/api/config');

    expect(response.headers()['content-type']).toContain('application/json');

    // Config can be cached
    const cacheControl = response.headers()['cache-control'];
    if (cacheControl) {
      expect(cacheControl).toMatch(/public|max-age/);
    }
  });
});