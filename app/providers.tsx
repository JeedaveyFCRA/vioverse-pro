'use client';

import Script from 'next/script';

/**
 * Provider component for CSP nonce injection
 */
export function NonceProvider({ children }: { children: React.ReactNode }) {
  // This would be passed from the server component
  return <>{children}</>;
}

/**
 * Script loader with CSP nonce support
 */
export function SecureScript(props: Parameters<typeof Script>[0]) {
  // In a real implementation, get nonce from headers
  // const nonce = headers().get('x-nonce');

  return (
    <Script
      {...props}
      // nonce={nonce}
    />
  );
}