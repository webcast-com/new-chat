import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'hyperlink-api',
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
