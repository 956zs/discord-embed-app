import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3008";
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "1h";

    console.log("🔄 代理指標請求到:", `${backendUrl}/api/metrics/system?period=${period}`);

    const response = await fetch(
      `${backendUrl}/api/metrics/system?period=${period}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("❌ 後端指標 API 錯誤:", response.status);
      return NextResponse.json(
        { error: "Failed to fetch metrics" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ 代理指標請求失敗:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
