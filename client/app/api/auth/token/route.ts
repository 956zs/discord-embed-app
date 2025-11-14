import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 代理到後端 Express server
    // 使用 BACKEND_URL（服務器端）或 NEXT_PUBLIC_API_URL（客戶端後備）
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3008';
    
    console.log('🔄 代理認證請求到:', backendUrl);
    
    const response = await fetch(`${backendUrl}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ 後端認證失敗:', response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log('✅ 認證成功，用戶:', data.username);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
