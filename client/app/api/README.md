# Next.js API Routes (代理層)

這個目錄包含 Next.js API routes，用於代理前端請求到後端 Express server。

## 為什麼需要代理？

Discord Embedded App 的前端運行在 Discord 的 iframe 中（`discordsays.com` 域名），無法直接訪問 `localhost` 或內網 IP。通過 Next.js API routes 作為代理層，可以：

1. **前端使用相對路徑**：`/api/auth/token` 而不是 `http://localhost:3102/api/auth/token`
2. **後端保持內網**：Express server 只需監聽 localhost，不需要公網暴露
3. **統一域名**：前端和 API 在同一個域名下，避免 CORS 問題

## 架構

```
Discord Client (iframe)
    ↓ (相對路徑請求)
Next.js Frontend (port 3000)
    ↓ (Next.js API Route 代理)
Express Backend (port 3102, localhost only)
    ↓
PostgreSQL Database
```

## 環境變數

在 `client/.env.local` 中配置：

```bash
# 前端不需要配置 API URL（使用相對路徑）
NEXT_PUBLIC_API_URL=

# 後端 URL（僅供 Next.js server 端使用）
# Development: BACKEND_URL=http://localhost:3008
# Production: BACKEND_URL=http://localhost:3102
BACKEND_URL=http://localhost:3008
```

## 添加新的代理端點

創建新文件 `client/app/api/your-endpoint/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3102';
  const response = await fetch(`${backendUrl}/api/your-endpoint`);
  const data = await response.json();
  return NextResponse.json(data);
}
```
