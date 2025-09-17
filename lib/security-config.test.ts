import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSecurityConfig,
  formatCSP,
  validateCSP,
  type ContentSecurityPolicy,
} from './security-config';

describe('Security Configuration', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true
    });
  });

  describe('getSecurityConfig', () => {
    it('returns development config in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true
      });
      const config = getSecurityConfig();

      // Should allow unsafe-inline for development
      expect(config.csp.directives.scriptSrc).toContain("'unsafe-inline'");
      expect(config.csp.directives.scriptSrc).toContain("'unsafe-eval'");

      // Should not have HSTS in development
      expect(config.headers.strictTransportSecurity).toBeUndefined();
    });

    it('returns production config in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true
      });
      const config = getSecurityConfig();

      // Should use strict-dynamic in production
      expect(config.csp.directives.scriptSrc).toContain("'strict-dynamic'");
      expect(config.csp.directives.scriptSrc).not.toContain("'unsafe-inline'");

      // Should have HSTS in production
      expect(config.headers.strictTransportSecurity).toBeTruthy();
      expect(config.headers.strictTransportSecurity).toContain('max-age=31536000');
    });

    it('includes all required security headers', () => {
      const config = getSecurityConfig();

      expect(config.headers.contentTypeOptions).toBe('nosniff');
      expect(config.headers.frameOptions).toBe('DENY');
      expect(config.headers.xssProtection).toBe('1; mode=block');
      expect(config.headers.referrerPolicy).toBe('strict-origin-when-cross-origin');
      expect(config.headers.permissionsPolicy).toContain('camera=()');
    });
  });

  describe('formatCSP', () => {
    it('formats CSP directives correctly', () => {
      const directives: ContentSecurityPolicy['directives'] = {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'strict-dynamic'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        childSrc: ["'self'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'", 'blob:'],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        manifestSrc: ["'self'"],
      };

      const csp = formatCSP(directives);

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'strict-dynamic'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("img-src 'self' data: blob:");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('replaces nonce placeholder', () => {
      const directives: ContentSecurityPolicy['directives'] = {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'nonce-{{nonce}}'"],
        styleSrc: [],
        imgSrc: [],
        fontSrc: [],
        connectSrc: [],
        mediaSrc: [],
        objectSrc: [],
        childSrc: [],
        frameSrc: [],
        workerSrc: [],
        frameAncestors: [],
        formAction: [],
        baseUri: [],
        manifestSrc: [],
      };

      const nonce = 'test-nonce-123';
      const csp = formatCSP(directives, nonce);

      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(csp).not.toContain('{{nonce}}');
    });

    it('filters out empty directives', () => {
      const directives: ContentSecurityPolicy['directives'] = {
        defaultSrc: ["'self'"],
        scriptSrc: [],
        styleSrc: [],
        imgSrc: [],
        fontSrc: [],
        connectSrc: [],
        mediaSrc: [],
        objectSrc: [],
        childSrc: [],
        frameSrc: [],
        workerSrc: [],
        frameAncestors: [],
        formAction: [],
        baseUri: [],
        manifestSrc: [],
      };

      const csp = formatCSP(directives);

      // Should only contain default-src
      expect(csp).toBe("default-src 'self'");
    });
  });

  describe('validateCSP', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalWarn = console.warn;

    beforeEach(() => {
      console.warn = vi.fn();
    });

    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true
    });
      console.warn = originalWarn;
    });

    it('validates safe CSP in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true
      });

      const csp: ContentSecurityPolicy = {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'strict-dynamic'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          childSrc: ["'self'"],
          frameSrc: ["'none'"],
          workerSrc: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"],
          manifestSrc: ["'self'"],
        },
      };

      const isValid = validateCSP(csp);
      expect(isValid).toBe(true);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('warns about unsafe-inline in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true
      });

      const csp: ContentSecurityPolicy = {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          childSrc: ["'self'"],
          frameSrc: ["'none'"],
          workerSrc: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"],
          manifestSrc: ["'self'"],
        },
      };

      const isValid = validateCSP(csp);
      expect(isValid).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("'unsafe-inline'")
      );
    });

    it('warns about unsafe-eval in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true
      });

      const csp: ContentSecurityPolicy = {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-eval'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          childSrc: ["'self'"],
          frameSrc: ["'none'"],
          workerSrc: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"],
          manifestSrc: ["'self'"],
        },
      };

      const isValid = validateCSP(csp);
      expect(isValid).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("'unsafe-eval'")
      );
    });

    it('allows unsafe directives in development', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true
      });

      const csp: ContentSecurityPolicy = {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          mediaSrc: ["'self'"],
          objectSrc: ["'none'"],
          childSrc: ["'self'"],
          frameSrc: ["'none'"],
          workerSrc: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"],
          manifestSrc: ["'self'"],
        },
      };

      const isValid = validateCSP(csp);
      expect(isValid).toBe(true);
      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});