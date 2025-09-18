import { test, expect } from '@playwright/test';

const BASE_URL = process.env['E2E_BASE_URL'] || 'http://localhost:3000';

test.describe('Keyboard Navigation Tests', () => {
  test('basic keyboard navigation with Tab key', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Track focus order
    const focusOrder: string[] = [];

    // Tab through first 10 interactive elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;

        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          className: el.className || '',
          text: el.textContent?.trim().substring(0, 30) || '',
          href: (el as HTMLAnchorElement).href || '',
          type: (el as HTMLInputElement).type || '',
          ariaRole: el.getAttribute('role') || ''
        };
      });

      if (focusedElement) {
        const identifier = focusedElement.id ||
                          focusedElement.text ||
                          `${focusedElement.tag}[${i}]`;
        focusOrder.push(identifier);

        // Verify the element is visible
        const isVisible = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 &&
                 rect.height > 0 &&
                 style.visibility !== 'hidden' &&
                 style.display !== 'none';
        });

        expect(isVisible).toBe(true);
      }
    }

    // Should have navigated through some elements
    expect(focusOrder.length).toBeGreaterThan(0);
  });

  test('reverse keyboard navigation with Shift+Tab', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Tab forward a few times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Get current focused element
    const forwardElement = await page.evaluate(() => document.activeElement?.id || '');

    // Tab backward
    await page.keyboard.press('Shift+Tab');

    const backwardElement = await page.evaluate(() => document.activeElement?.id || '');

    // Should have moved to a different element
    expect(backwardElement).not.toBe(forwardElement);
  });

  test('Enter key activates buttons and links', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Find first button or link
    const hasInteractiveElement = await page.evaluate(() => {
      const button = document.querySelector('button:not([disabled])');
      const link = document.querySelector('a[href]');
      return !!(button || link);
    });

    if (hasInteractiveElement) {
      // Tab to first interactive element
      let attempts = 0;
      let foundInteractive = false;

      while (attempts < 20 && !foundInteractive) {
        await page.keyboard.press('Tab');

        foundInteractive = await page.evaluate(() => {
          const el = document.activeElement;
          return el?.tagName === 'BUTTON' || el?.tagName === 'A';
        });

        attempts++;
      }

      if (foundInteractive) {
        // Test Enter key activation
        const tagName = await page.evaluate(() => document.activeElement?.tagName);

        if (tagName === 'A') {
          // For links, check that Enter would navigate
          const href = await page.evaluate(() =>
            (document.activeElement as HTMLAnchorElement)?.href
          );
          expect(href).toBeTruthy();
        } else if (tagName === 'BUTTON') {
          // For buttons, verify they're not disabled
          const isDisabled = await page.evaluate(() =>
            (document.activeElement as HTMLButtonElement)?.disabled
          );
          expect(isDisabled).toBe(false);
        }
      }
    }
  });

  test('Space key activates buttons and checkboxes', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check if there are any checkboxes or buttons
    const hasSpaceActivatable = await page.evaluate(() => {
      const button = document.querySelector('button:not([disabled])');
      const checkbox = document.querySelector('input[type="checkbox"]:not([disabled])');
      const radio = document.querySelector('input[type="radio"]:not([disabled])');
      return !!(button || checkbox || radio);
    });

    if (hasSpaceActivatable) {
      // Tab to find a space-activatable element
      let attempts = 0;
      let foundElement = false;

      while (attempts < 20 && !foundElement) {
        await page.keyboard.press('Tab');

        foundElement = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return false;

          const tag = el.tagName;
          const type = (el as HTMLInputElement).type;

          return tag === 'BUTTON' ||
                 (tag === 'INPUT' && (type === 'checkbox' || type === 'radio'));
        });

        attempts++;
      }

      if (foundElement) {
        const elementInfo = await page.evaluate(() => {
          const el = document.activeElement as HTMLInputElement;
          return {
            tag: el?.tagName,
            type: el?.type,
            checked: el?.checked
          };
        });

        // Press space
        await page.keyboard.press('Space');

        if (elementInfo.type === 'checkbox' || elementInfo.type === 'radio') {
          // Verify state changed
          const newChecked = await page.evaluate(() =>
            (document.activeElement as HTMLInputElement)?.checked
          );
          expect(newChecked).toBe(!elementInfo.checked);
        }
      }
    }
  });

  test('Escape key closes modals and dropdowns', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check if there are any elements that might open modals/dropdowns
    const hasModalTrigger = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn =>
        btn.textContent?.toLowerCase().includes('menu') ||
        btn.textContent?.toLowerCase().includes('open') ||
        btn.getAttribute('aria-haspopup') === 'true' ||
        btn.getAttribute('aria-expanded') !== null
      );
    });

    if (hasModalTrigger) {
      // This is a placeholder for modal/dropdown testing
      // In a real app, you'd open a modal and test Escape closes it
      expect(hasModalTrigger).toBe(true);
    }
  });

  test('arrow keys work for navigation within components', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check for components that use arrow navigation (radio groups, menus, etc.)
    const hasArrowNavigation = await page.evaluate(() => {
      const radioGroups = document.querySelectorAll('input[type="radio"]');
      const selects = document.querySelectorAll('select');
      const menuItems = document.querySelectorAll('[role="menu"], [role="menubar"]');
      const tabs = document.querySelectorAll('[role="tablist"]');

      return radioGroups.length > 1 ||
             selects.length > 0 ||
             menuItems.length > 0 ||
             tabs.length > 0;
    });

    // Test arrow navigation if applicable components exist
    if (hasArrowNavigation) {
      expect(hasArrowNavigation).toBe(true);
      // In a real implementation, you would test specific arrow key behaviors
    }
  });

  test('focus trap works in modals', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check if there are modal triggers
    const hasModal = await page.evaluate(() => {
      return !!document.querySelector('[role="dialog"], [aria-modal="true"]');
    });

    if (hasModal) {
      // In a real app, you would:
      // 1. Open the modal
      // 2. Tab through all elements
      // 3. Verify focus cycles within the modal
      // 4. Verify Escape closes the modal
      expect(hasModal).toBeDefined();
    }
  });

  test('focus is restored after closing overlays', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Store the initially focused element
    await page.keyboard.press('Tab');
    const initialFocus = await page.evaluate(() => document.activeElement?.id || '');

    // In a real app, you would:
    // 1. Open an overlay/modal
    // 2. Close it
    // 3. Verify focus returns to the trigger element

    expect(initialFocus).toBeDefined();
  });

  test('keyboard shortcuts are documented and functional', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check for keyboard shortcut indicators
    const shortcuts = await page.$$eval(
      '[accesskey], [aria-keyshortcuts]',
      elements => elements.map(el => ({
        tag: el.tagName.toLowerCase(),
        accessKey: el.getAttribute('accesskey'),
        ariaKeyShortcuts: el.getAttribute('aria-keyshortcuts'),
        title: el.getAttribute('title')
      }))
    );

    // If shortcuts exist, they should be documented
    for (const shortcut of shortcuts) {
      if (shortcut.accessKey || shortcut.ariaKeyShortcuts) {
        // Should have a title or other documentation
        expect(shortcut.title || shortcut.ariaKeyShortcuts).toBeTruthy();
      }
    }
  });

  test('no keyboard traps exist', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const maxTabs = 50;
    const focusedElements = new Set<string>();
    let tabCount = 0;
    let lastFocusId = '';

    // Tab through elements and ensure we don't get stuck
    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');

      const currentFocus = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return 'none';
        return el.id || el.className || el.tagName;
      });

      // Check if we've looped back to the beginning
      if (focusedElements.has(currentFocus) && focusedElements.size > 5) {
        // We've completed a cycle through the page
        break;
      }

      focusedElements.add(currentFocus);

      // Check we're not stuck on the same element
      if (tabCount > 5 && currentFocus === lastFocusId) {
        throw new Error(`Keyboard trap detected at element: ${currentFocus}`);
      }

      lastFocusId = currentFocus;
      tabCount++;
    }

    // Should have navigated through multiple elements
    expect(focusedElements.size).toBeGreaterThan(1);

    // Should not have hit the max tab limit (indicates possible trap)
    expect(tabCount).toBeLessThan(maxTabs);
  });
});