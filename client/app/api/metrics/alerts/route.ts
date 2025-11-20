import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3008";
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit") || "50";

    console.log("🔄 代理告警請求到:", `${backendUrl}/api/metrics/alerts?limit=${limit}`);

    const response = await fetch(
      `${backendUrl}/api/metrics/alerts?limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error("❌ 後端告警 API 錯誤:", response.status);
      return NextResponse.json(
        { error: "Failed to fetch alerts" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ 代理告警請求失敗:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
