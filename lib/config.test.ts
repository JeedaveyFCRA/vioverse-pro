import { describe, it, expect, vi } from 'vitest';
import { getUIConfig, UIConfigSchema } from './config';

// Mock the import for ui.json
vi.mock('@/data/config/ui.json', () => ({
  default: {
    app: {
      title: 'Test App',
      subtitle: 'Test Subtitle',
      description: 'Test Description',
      version: '1.0.0',
      techStack: 'Test Stack'
    },
    nav: ['Home', 'About', 'Contact'],
    status: {
      title: 'Status',
      items: [
        { label: 'Test', value: 'Ready', status: 'success' }
      ]
    },
    features: {
      title: 'Features',
      items: [
        { icon: '🎯', title: 'Feature 1', description: 'Description 1' }
      ]
    },
    labels: {
      search: 'Search',
      upload: 'Upload'
    },
    violations: {
      severities: ['high', 'medium', 'low'],
      bureaus: ['TU', 'EQ', 'EX'],
      messages: { noViolations: 'No violations' },
      stats: { total: 'Total' }
    },
    pdf: {
      defaultFormat: 'png',
      defaultBackground: 'white',
      defaultFont: 'Arial',
      controls: { next: 'Next' }
    },
    elements: {
      ids: { button: 'btn' }
    }
  }
}));

describe('Config Module', () => {
  describe('getUIConfig', () => {
    it('should load and validate UI configuration', async () => {
      const config = await getUIConfig();

      expect(config).toBeDefined();
      expect(config.app).toBeDefined();
      expect(config.app.title).toBe('Test App');
    });

    it('should have navigation items', async () => {
      const config = await getUIConfig();

      expect(config.nav).toBeDefined();
      expect(config.nav.length).toBeGreaterThan(0);
      expect(config.nav).toContain('Home');
    });

    it('should have label configuration', async () => {
      const config = await getUIConfig();

      expect(config.labels).toBeDefined();
      expect(config.labels['search']).toBe('Search');
      expect(config.labels['upload']).toBe('Upload');
    });

    it('should have violation configuration', async () => {
      const config = await getUIConfig();

      expect(config.violations).toBeDefined();
      expect(config.violations.severities).toContain('high');
      expect(config.violations.bureaus).toContain('TU');
    });
  });

  describe('UIConfigSchema', () => {
    it('should validate correct config structure', () => {
      const validConfig = {
        app: {
          title: 'App',
          subtitle: 'Subtitle',
          description: 'Desc',
          version: '1.0.0',
          techStack: 'Stack'
        },
        nav: ['Item1'],
        status: {
          title: 'Status',
          items: []
        },
        features: {
          title: 'Features',
          items: []
        },
        labels: {},
        violations: {
          severities: [],
          bureaus: [],
          messages: {},
          stats: {}
        },
        pdf: {
          defaultFormat: 'png',
          defaultBackground: 'white',
          defaultFont: 'Arial',
          controls: {}
        },
        elements: {
          ids: {}
        }
      };

      const result = UIConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid config structure', () => {
      const invalidConfig = {
        app: {
          // missing required fields
          title: 'App'
        },
        nav: 'not-an-array', // should be array
      };

      const result = UIConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });
});