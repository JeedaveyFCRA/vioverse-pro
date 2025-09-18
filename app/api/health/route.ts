import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
export function GET() {
  const response = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    commit: process.env.RENDER_GIT_COMMIT || 'local',
    uptime: process.uptime(),
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }
  });
}