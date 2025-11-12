"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugPage() {
  const [guildId, setGuildId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 從環境變數獲取
    const gid = process.env.NEXT_PUBLIC_DEV_GUILD_ID || "";
    const uid = process.env.NEXT_PUBLIC_DEV_USER_ID || "";

    setGuildId(gid);
    setUserId(uid);

    console.log("環境變數:", {
      NEXT_PUBLIC_DEV_GUILD_ID: process.env.NEXT_PUBLIC_DEV_GUILD_ID,
      NEXT_PUBLIC_DEV_USER_ID: process.env.NEXT_PUBLIC_DEV_USER_ID,
      NEXT_PUBLIC_ENABLE_DEV_MODE: process.env.NEXT_PUBLIC_ENABLE_DEV_MODE,
    });

    if (gid && uid) {
      checkAdmin(gid, uid);
    }
  }, []);

  const checkAdmin = async (gid: string, uid: string) => {
    try {
      console.log("檢查管理員:", { gid, uid });
      const url = `/api/history/${gid}/admins/${uid}/check`;
      console.log("API URL:", url);

      const response = await axios.get(url);
      console.log("API 響應:", response.data);

      setApiResponse(response.data);
      setIsAdmin(response.data.isAdmin);
    } catch (err: any) {
      console.error("錯誤:", err);
      setError(err.message);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>管理員狀態調試</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">環境變數</h3>
            <pre className="bg-muted p-4 rounded mt-2 text-xs overflow-auto">
              {JSON.stringify(
                {
                  NEXT_PUBLIC_DEV_GUILD_ID:
                    process.env.NEXT_PUBLIC_DEV_GUILD_ID,
                  NEXT_PUBLIC_DEV_USER_ID: process.env.NEXT_PUBLIC_DEV_USER_ID,
                  NEXT_PUBLIC_ENABLE_DEV_MODE:
                    process.env.NEXT_PUBLIC_ENABLE_DEV_MODE,
                },
                null,
                2
              )}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold">當前狀態</h3>
            <pre className="bg-muted p-4 rounded mt-2 text-xs overflow-auto">
              {JSON.stringify(
                {
                  guildId,
                  userId,
                  isAdmin,
                },
                null,
                2
              )}
            </pre>
          </div>

          {apiResponse && (
            <div>
              <h3 className="font-semibold">API 響應</h3>
              <pre className="bg-muted p-4 rounded mt-2 text-xs overflow-auto">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>
          )}

          {error && (
            <div>
              <h3 className="font-semibold text-red-600">錯誤</h3>
              <pre className="bg-red-50 p-4 rounded mt-2 text-xs overflow-auto text-red-600">
                {error}
              </pre>
            </div>
          )}

          <div>
            <h3 className="font-semibold">管理員狀態</h3>
            <div className="mt-2">
              {isAdmin === null ? (
                <span className="text-muted-foreground">檢查中...</span>
              ) : isAdmin ? (
                <span className="text-green-600 font-bold">✅ 是管理員</span>
              ) : (
                <span className="text-red-600 font-bold">❌ 不是管理員</span>
              )}
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                if (guildId && userId) {
                  checkAdmin(guildId, userId);
                }
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              重新檢查
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
