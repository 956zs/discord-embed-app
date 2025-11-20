import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasAdminToken: !!process.env.ADMIN_TOKEN,
    adminTokenPreview: process.env.ADMIN_TOKEN
      ? `${process.env.ADMIN_TOKEN.substring(0, 8)}...`
      : "undefined",
    backendUrl: process.env.BACKEND_URL,
    allEnvKeys: Object.keys(process.env).filter(
      (k) => k.includes("ADMIN") || k.includes("BACKEND")
    ),
  });
}
