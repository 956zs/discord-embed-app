import { NextRequest, NextResponse } from 'next/server';

// 增加超時時間到 60 秒（獲取頻道列表需要較長時間）
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const backendUrl = process.env.BACKEND_URL;
    const pathStr = path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${backendUrl}/api/fetch/${pathStr}${searchParams ? `?${searchParams}` : ''}`;

    // 增加 fetch 超時時間
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 秒超時

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(data, { status: response.status });
      }

      return NextResponse.json(data);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout', details: 'Backend took too long to respond' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Fetch API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const backendUrl = process.env.BACKEND_URL;
    const pathStr = path.join('/');
    const body = await request.json();
    const url = `${backendUrl}/api/fetch/${pathStr}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Fetch API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
