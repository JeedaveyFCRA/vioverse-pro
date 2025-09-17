import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    };
  },
  useSearchParams() {
    return {
      get: vi.fn(),
    };
  },
  usePathname() {
    return '';
  },
}));

// Mock environment variables for tests
process.env['NEXT_PUBLIC_APP_URL'] = 'http://localhost:3000';
process.env['NEXT_PUBLIC_API_URL'] = 'http://localhost:3000/api';

// Suppress console errors during tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});