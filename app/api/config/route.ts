import { NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';

/**
 * GET /api/config
 * Returns the complete configuration object
 */
export async function GET() {
  try {
    const config = await getConfig();

    return NextResponse.json(config, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
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