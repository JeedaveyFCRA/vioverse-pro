/**
 * Security configuration for the application
 * Based on OWASP security best practices
 */

export interface SecurityConfig {
  csp: ContentSecurityPolicy;
  headers: SecurityHeaders;
}

export interface ContentSecurityPolicy {
  directives: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    fontSrc: string[];
    connectSrc: string[];
    mediaSrc: string[];
    objectSrc: string[];
    prefetchSrc?: string[];
    childSrc: string[];
    frameSrc: string[];
    workerSrc: string[];
    frameAncestors: string[];
    formAction: string[];
    baseUri: string[];
    manifestSrc: string[];
    upgradeInsecureRequests?: boolean;
    blockAllMixedContent?: boolean;
  };
  reportUri?: string;
  reportOnly?: boolean;
}

export interface SecurityHeaders {
  contentTypeOptions: string;
  frameOptions: 'DENY' | 'SAMEORIGIN';
  xssProtection: string;
  referrerPolicy: string;
  permissionsPolicy: string;
  strictTransportSecurity?: string;
  expectCT?: string;
  featurePolicy?: string;
}

// Development CSP - More permissive for hot reload
const developmentCSP: ContentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      'https:',
      'http:',
      'localhost:*',
      'ws:',
      'wss:',
    ],
    styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
    fontSrc: ["'self'", 'data:', 'https:', 'http:'],
    connectSrc: [
      "'self'",
      'localhost:*',
      'ws:',
      'wss:',
      'https:',
      'http:',
    ],
    mediaSrc: ["'self'", 'blob:'],
    objectSrc: ["'none'"],
    childSrc: ["'self'"],
    frameSrc: ["'self'"],
    workerSrc: ["'self'", 'blob:'],
    frameAncestors: ["'self'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
  },
  reportOnly: false,
};

// Production CSP - Strict security
const productionCSP: ContentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'strict-dynamic'",
      "'nonce-{{nonce}}'", // Will be replaced with actual nonce
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for Next.js styled-jsx
    ],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https://res.cloudinary.com', // If using Cloudinary
      'https://*.vercel-insights.com',
    ],
    fontSrc: ["'self'", 'data:'],
    connectSrc: [
      "'self'",
      process.env['NEXT_PUBLIC_API_URL'] || '',
      'https://vitals.vercel-insights.com',
      'https://*.vercel-insights.com',
    ],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    childSrc: ["'self'"],
    frameSrc: ["'none'"],
    workerSrc: ["'self'", 'blob:'],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: true,
    blockAllMixedContent: true,
  },
  reportUri: process.env['CSP_REPORT_URI'],
  reportOnly: false,
};

// Security headers configuration
const securityHeaders: SecurityHeaders = {
  contentTypeOptions: 'nosniff',
  frameOptions: 'DENY',
  xssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
    'ambient-light-sensor=()',
    'autoplay=()',
    'encrypted-media=()',
    'picture-in-picture=()',
    'sync-xhr=()',
    'battery=()',
    'display-capture=()',
  ].join(', '),
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  expectCT: 'max-age=86400, enforce',
};

/**
 * Get security configuration based on environment
 */
export function getSecurityConfig(): SecurityConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    csp: isDevelopment ? developmentCSP : productionCSP,
    headers: {
      ...securityHeaders,
      // Don't set HSTS in development
      strictTransportSecurity: isDevelopment
        ? undefined
        : securityHeaders.strictTransportSecurity,
      expectCT: isDevelopment ? undefined : securityHeaders.expectCT,
    },
  };
}

/**
 * Format CSP directives into a string
 */
export function formatCSP(
  directives: ContentSecurityPolicy['directives'],
  nonce?: string
): string {
  return Object.entries(directives)
    .filter(([_, values]) => values && (Array.isArray(values) ? values.length > 0 : values))
    .map(([directive, values]) => {
      const key = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
      const value = Array.isArray(values)
        ? values.join(' ').replace(/{{nonce}}/g, nonce || '')
        : values;
      return `${key} ${value}`;
    })
    .join('; ');
}

/**
 * Validate CSP configuration
 */
export function validateCSP(csp: ContentSecurityPolicy): boolean {
  // Check for unsafe directives in production
  if (process.env.NODE_ENV === 'production') {
    const unsafePatterns = ["'unsafe-inline'", "'unsafe-eval'"];
    const scriptSrc = csp.directives.scriptSrc.join(' ');

    for (const pattern of unsafePatterns) {
      if (scriptSrc.includes(pattern)) {
        console.warn(
          `⚠️ CSP contains ${pattern} in script-src directive. This reduces security.`
        );
        return false;
      }
    }
  }

  return true;
}

export default getSecurityConfig;