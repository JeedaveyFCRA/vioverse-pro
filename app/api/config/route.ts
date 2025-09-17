import { NextResponse } from 'next/server';
import { configLoader } from '@/lib/config';
import { headers } from 'next/headers';

/**
 * GET /api/config
 * Returns the complete configuration object
 */
export async function GET() {
  try {
    // Check for cache headers
    const headersList = headers();
    const ifNoneMatch = headersList.get('if-none-match');

    // Load configuration
    const config = await configLoader.loadConfig();

    // Generate ETag based on config content
    const configString = JSON.stringify(config);
    const etag = `"${Buffer.from(configString).toString('base64').substring(0, 27)}"`;

    // Return 304 if config hasn't changed
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
        }
      });
    }

    // Return config with caching headers
    return NextResponse.json(config, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'ETag': etag,
      },
    });
  } catch (error) {
    console.error('Failed to load configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/config/reload
 * Reload configuration (dev only)
 */
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Configuration reload is only available in development' },
      { status: 403 }
    );
  }

  try {
    await configLoader.reloadConfig();
    const config = await configLoader.loadConfig();

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Failed to reload configuration:', error);
    return NextResponse.json(
      { error: 'Failed to reload configuration' },
      { status: 500 }
    );
  }
}