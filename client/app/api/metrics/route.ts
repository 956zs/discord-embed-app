import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3008";
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "1h";
    const adminToken = process.env.ADMIN_TOKEN;

    console.log("[Monitoring API] 🔄 代理指標請求到:", `${backendUrl}/api/metrics?period=${period}`);
    console.log("[Monitoring API] 🔑 ADMIN_TOKEN exists:", !!adminToken);
    console.log("[Monitoring API] 🔑 ADMIN_TOKEN value:", adminToken ? `${adminToken.substring(0, 8)}...` : "undefined");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // 如果有 admin token，加入 Authorization header
    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    }

    const response = await fetch(
      `${backendUrl}/api/metrics?period=${period}`,
      {
        method: "GET",
        headers,
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
