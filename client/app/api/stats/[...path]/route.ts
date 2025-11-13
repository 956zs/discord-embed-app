import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3008';
    const path = params.path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${backendUrl}/api/stats/${path}${searchParams ? `?${searchParams}` : ''}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Stats API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
