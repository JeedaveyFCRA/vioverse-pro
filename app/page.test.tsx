import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import HomePage from './page';

// Mock the config module
vi.mock('@/lib/config', () => ({
  getUIConfig: vi.fn().mockResolvedValue({
    app: {
      title: 'Test Vioverse',
      subtitle: 'Test Analysis System',
      version: 'Version 1.0.0',
      techStack: 'Next.js & TypeScript'
    },
    status: {
      title: 'System Status',
      items: [
        { label: 'Database', value: 'Connected', status: 'success' },
        { label: 'API', value: 'Running', status: 'success' }
      ]
    },
    features: {
      title: 'Features',
      items: [
        { icon: '🚀', title: 'Fast', description: 'Lightning fast' },
        { icon: '🔒', title: 'Secure', description: 'Enterprise security' }
      ]
    }
  })
}));

describe('HomePage', () => {
  it('should render the app title from config', async () => {
    const component = await HomePage();
    const { container } = render(component);

    expect(container.textContent).toContain('Test Vioverse');
    expect(container.textContent).toContain('Test Analysis System');
  });

  it('should render status items from config', async () => {
    const component = await HomePage();
    const { container } = render(component);

    expect(container.textContent).toContain('Database: Connected');
    expect(container.textContent).toContain('API: Running');
  });

  it('should render feature items from config', async () => {
    const component = await HomePage();
    const { container } = render(component);

    expect(container.textContent).toContain('Fast');
    expect(container.textContent).toContain('Lightning fast');
    expect(container.textContent).toContain('Secure');
    expect(container.textContent).toContain('Enterprise security');
  });

  it('should display version information', async () => {
    const component = await HomePage();
    const { container } = render(component);

    expect(container.textContent).toContain('Version 1.0.0');
    expect(container.textContent).toContain('Next.js & TypeScript');
  });
});