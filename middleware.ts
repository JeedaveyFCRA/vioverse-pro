import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSecurityConfig, formatCSP } from '@/lib/security-config';

/**
 * Security headers middleware
 * Implements OWASP security best practices
 */
export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const securityConfig = getSecurityConfig();

  // Format and apply Content Security Policy
  const cspHeader = formatCSP(securityConfig.csp.directives, nonce);

  // Apply security headers
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', securityConfig.headers.contentTypeOptions);
  response.headers.set('X-Frame-Options', securityConfig.headers.frameOptions);
  response.headers.set('X-XSS-Protection', securityConfig.headers.xssProtection);
  response.headers.set('Referrer-Policy', securityConfig.headers.referrerPolicy);
  response.headers.set('Permissions-Policy', securityConfig.headers.permissionsPolicy);

  // HSTS (HTTP Strict Transport Security) - Only in production
  if (securityConfig.headers.strictTransportSecurity) {
    response.headers.set(
      'Strict-Transport-Security',
      securityConfig.headers.strictTransportSecurity
    );
  }

  // Expect-CT header for certificate transparency
  if (securityConfig.headers.expectCT) {
    response.headers.set('Expect-CT', securityConfig.headers.expectCT);
  }

  // Add nonce to response for CSP
  response.headers.set('x-nonce', nonce);

  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health (health check endpoint)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    {
      source: '/((?!api/health|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};