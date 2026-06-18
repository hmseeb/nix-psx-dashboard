import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      status: 'offline',
      message: 'PSX dashboard has been taken down by owner request.',
    },
    {
      status: 410,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
