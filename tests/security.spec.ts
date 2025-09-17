import { test, expect } from '@playwright/test';

const BASE_URL = process.env['E2E_BASE_URL'] || 'http://localhost:3000';

test.describe('Security Headers Tests', () => {
  test('security headers are present on homepage', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    // Check Content Security Policy
    expect(headers['content-security-policy']).toBeTruthy();
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['content-security-policy']).toContain("script-src");
    expect(headers['content-security-policy']).toContain("style-src");

    // Check X-Frame-Options
    expect(headers['x-frame-options']).toBe('DENY');

    // Check X-Content-Type-Options
    expect(headers['x-content-type-options']).toBe('nosniff');

    // Check X-XSS-Protection
    expect(headers['x-xss-protection']).toBe('1; mode=block');

    // Check Referrer-Policy
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    // Check Permissions-Policy
    expect(headers['permissions-policy']).toBeTruthy();
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['permissions-policy']).toContain('microphone=()');
    expect(headers['permissions-policy']).toContain('geolocation=()');

    // Check nonce is present
    expect(headers['x-nonce']).toBeTruthy();
  });

  test('security headers are present on API routes', async ({ request }) => {
    const response = await request.get('/api/config');
    const headers = response.headers();

    // API routes should also have security headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
  });

  test('HSTS header is set in production', async ({ request }) => {
    // Skip this test if not in production
    if (process.env.NODE_ENV !== 'production') {
      test.skip();
      return;
    }

    const response = await request.get('/');
    const headers = response.headers();

    expect(headers['strict-transport-security']).toBeTruthy();
    expect(headers['strict-transport-security']).toContain('max-age=31536000');
    expect(headers['strict-transport-security']).toContain('includeSubDomains');
    expect(headers['strict-transport-security']).toContain('preload');
  });

  test('CSP blocks unsafe inline scripts', async ({ page }) => {
    await page.goto(BASE_URL);

    // Try to inject an unsafe inline script
    const violationPromise = page.waitForEvent('console', msg =>
      msg.text().includes('Content Security Policy') ||
      msg.text().includes('CSP')
    );

    // Attempt to execute inline script
    const scriptError = await page.evaluate(() => {
      try {
        const script = document.createElement('script');
        script.textContent = 'console.log("unsafe inline script");';
        document.head.appendChild(script);
        return null;
      } catch (error) {
        return error instanceof Error ? error.toString() : String(error);
      }
    });

    // In development, CSP might be more permissive
    if (process.env.NODE_ENV === 'production') {
      // Should either throw an error or trigger a CSP violation
      const violation = await Promise.race([
        violationPromise,
        new Promise(resolve => setTimeout(() => resolve(null), 1000))
      ]);

      expect(scriptError || violation).toBeTruthy();
    }
  });

  test('CSP allows legitimate resources', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('CSP')) {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check that no CSP errors were logged for legitimate resources
    const cspErrors = consoleMessages.filter(msg =>
      msg.includes('Content Security Policy') &&
      msg.includes('blocked')
    );

    expect(cspErrors.length).toBe(0);
  });

  test('frame-ancestors prevents clickjacking', async ({ page }) => {
    await page.goto(BASE_URL);

    // Try to create an iframe pointing to the same origin
    const iframeBlocked = await page.evaluate((url) => {
      return new Promise<boolean>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.display = 'none';

        iframe.onload = () => resolve(false);
        iframe.onerror = () => resolve(true);

        document.body.appendChild(iframe);

        // Clean up after test
        setTimeout(() => {
          iframe.remove();
          resolve(true); // Assume blocked if no load event
        }, 1000);
      });
    }, BASE_URL);

    // X-Frame-Options: DENY should prevent iframe loading
    expect(iframeBlocked).toBe(true);
  });

  test('sensitive data is not exposed in headers', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    // Check that no sensitive information is exposed
    const headerKeys = Object.keys(headers);

    // These headers should NOT be present
    const forbiddenHeaders = [
      'server',
      'x-powered-by',
      'x-aspnet-version',
      'x-aspnetmvc-version',
      'x-debug',
    ];

    for (const forbidden of forbiddenHeaders) {
      expect(headerKeys).not.toContain(forbidden);
    }
  });

  test('CSP nonce is unique per request', async ({ request }) => {
    const response1 = await request.get('/');
    const response2 = await request.get('/');

    const nonce1 = response1.headers()['x-nonce'];
    const nonce2 = response2.headers()['x-nonce'];

    // Nonces should be present and unique
    expect(nonce1).toBeTruthy();
    expect(nonce2).toBeTruthy();
    expect(nonce1).not.toBe(nonce2);
  });

  test('mixed content is blocked', async ({ page }) => {
    // Only test in production or with HTTPS
    if (!BASE_URL.startsWith('https://')) {
      test.skip();
      return;
    }

    await page.goto(BASE_URL);

    // Try to load HTTP resource on HTTPS page
    const mixedContentBlocked = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const img = document.createElement('img');
        img.src = 'http://example.com/image.jpg';
        img.onload = () => resolve(false);
        img.onerror = () => resolve(true);
        document.body.appendChild(img);

        setTimeout(() => {
          img.remove();
          resolve(true); // Assume blocked if no load
        }, 1000);
      });
    });

    expect(mixedContentBlocked).toBe(true);
  });

  test('CSP report-uri is configured in production', async ({ request }) => {
    if (process.env['NODE_ENV'] !== 'production' || !process.env['CSP_REPORT_URI']) {
      test.skip();
      return;
    }

    const response = await request.get('/');
    const cspHeader = response.headers()['content-security-policy'];

    expect(cspHeader).toContain('report-uri');
    expect(cspHeader).toContain(process.env['CSP_REPORT_URI']);
  });
});

test.describe('Authentication Security', () => {
  test('auth cookies have secure flags', async ({ page, context }) => {
    // This test would require authentication setup
    // Placeholder for when auth is implemented

    await page.goto(BASE_URL);

    const cookies = await context.cookies();
    const authCookies = cookies.filter(c =>
      c.name.includes('auth') ||
      c.name.includes('session') ||
      c.name.includes('token')
    );

    for (const cookie of authCookies) {
      // In production, cookies should be secure
      if (process.env.NODE_ENV === 'production') {
        expect(cookie.secure).toBe(true);
        expect(cookie.sameSite).toBe('Strict');
      }
      expect(cookie.httpOnly).toBe(true);
    }
  });

  test('no sensitive data in localStorage', async ({ page }) => {
    await page.goto(BASE_URL);

    const localStorage = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          items[key] = window.localStorage.getItem(key) || '';
        }
      }
      return items;
    });

    // Check for sensitive data patterns
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /api[_-]?key/i,
      /secret/i,
      /private[_-]?key/i,
      /creditcard/i,
      /ssn/i,
    ];

    for (const [key, value] of Object.entries(localStorage)) {
      for (const pattern of sensitivePatterns) {
        expect(key).not.toMatch(pattern);
        expect(value).not.toMatch(pattern);
      }
    }
  });
});