"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChannelTree } from "@/components/admin/channel-tree";
import { FetchHistory } from "@/components/admin/fetch-history";
import { FetchProgress } from "@/components/admin/fetch-progress";
import { BatchFetch } from "@/components/admin/batch-fetch";
import type { FetchSummary } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3008";

export default function AdminPage() {
  const [guildId, setGuildId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FetchSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"channels" | "history" | "batch">(
    "batch"
  );
  const [channelsForBatch, setChannelsForBatch] = useState<any[]>([]);

  useEffect(() => {
    const initAdmin = async () => {
      try {
        const isDev = process.env.NODE_ENV === "development";
        const enableDevMode =
          process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === "true";

        let gid: string | null = null;
        let uid: string | null = null;

        if (isDev && enableDevMode) {
          // 開發模式
          gid = process.env.NEXT_PUBLIC_DEV_GUILD_ID || null;
          uid = process.env.NEXT_PUBLIC_DEV_USER_ID || null;
          console.log("🔧 管理員頁面開發模式:", { gid, uid });
        } else {
          // 生產模式：從 Discord SDK 獲取
          try {
            const { getDiscordContext } = await import("@/lib/discord-sdk");
            const context = await getDiscordContext();

            gid = context.guildId;
            uid = context.userId;

            console.log("📱 管理員頁面 Discord SDK:", { gid, uid });
          } catch (sdkError) {
            console.error("Discord SDK 初始化失敗:", sdkError);

            // 降級：從 URL 獲取
            const params = new URLSearchParams(window.location.search);
            gid = params.get("guild_id");
            uid = params.get("user_id");

            console.log("📍 管理員頁面從 URL 獲取:", { gid, uid });

            // 如果還是沒有，且在開發環境，使用環境變數作為最後後備
            if (isDev && (!gid || !uid)) {
              gid = gid || process.env.NEXT_PUBLIC_DEV_GUILD_ID || null;
              uid = uid || process.env.NEXT_PUBLIC_DEV_USER_ID || null;
              console.log("🔧 管理員頁面使用環境變數作為後備:", { gid, uid });
            }
          }
        }

        setGuildId(gid || "");
        setUserId(uid || "");

        if (gid && uid) {
          checkAdminStatus(gid, uid);
          loadSummary(gid);
          loadChannelsForBatch(gid);
        } else {
          console.warn("⚠️ 管理員頁面缺少 guild_id 或 user_id");
          setLoading(false);
        }
      } catch (error) {
        console.error("管理員頁面初始化失敗:", error);
        setLoading(false);
      }
    };

    initAdmin();
  }, []);

  const checkAdminStatus = async (gid: string, uid: string) => {
    try {
      // 使用相對路徑，通過 Next.js rewrites
      const response = await fetch(`/api/history/${gid}/admins/${uid}/check`);
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    } catch (error) {
      console.error("檢查管理員狀態失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (gid: string) => {
    try {
      // 使用相對路徑，通過 Next.js rewrites
      const response = await fetch(`/api/history/${gid}/summary`);
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("載入摘要失敗:", error);
    }
  };

  const loadChannelsForBatch = async (gid: string) => {
    try {
      console.log("📡 載入頻道分析數據...");

      // 獲取頻道列表
      const channelsRes = await fetch(`/api/history/${gid}/channels`);
      const channels = await channelsRes.json();

      // 獲取分析數據
      const analysisRes = await fetch(`/api/history/${gid}/analyze`);
      const analysis = await analysisRes.json();

      // 合併數據
      const analysisMap = new Map(analysis.map((a: any) => [a.channelId, a]));

      const enrichedChannels = channels.map((ch: any) => {
        const info = analysisMap.get(ch.id) || {
          needsUpdate: true,
          reason: "尚未提取過歷史訊息",
          messageCount: 0,
          lastFetchTime: null,
          lastMessageTime: null,
        };

        return {
          id: ch.id,
          name: ch.name,
          type: ch.type,
          position: ch.position,
          ...info,
        };
      });

      setChannelsForBatch(enrichedChannels);
      console.log(`✅ 載入了 ${enrichedChannels.length} 個頻道的分析數據`);
    } catch (error) {
      console.error("載入頻道分析數據失敗:", error);
    }
  };

  const handleBatchStart = async (channelIds: string[]) => {
    console.log("🚀 開始批量提取:", channelIds);

    for (const channelId of channelIds) {
      const channel = channelsForBatch.find((ch) => ch.id === channelId);
      if (!channel) continue;

      try {
        console.log(`📥 提取頻道: ${channel.name}`);

        const response = await fetch(`/api/fetch/${guildId}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: channel.id,
            channelName: channel.name,
            anchorMessageId: "latest",
            userId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log(`✅ ${channel.name} 提取任務已開始 (ID: ${data.taskId})`);
        } else {
          console.error(`❌ ${channel.name} 提取失敗:`, data.error);
        }

        // 延遲 1 秒避免過快
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ ${channel.name} 提取失敗:`, error);
      }
    }

    alert(
      `✅ 批量提取已完成！\n\n已啟動 ${channelIds.length} 個提取任務。\n\n請切換到「提取歷史」標籤查看進度。`
    );

    // 重新載入數據
    loadSummary(guildId);
    loadChannelsForBatch(guildId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>權限不足</CardTitle>
            <CardDescription>您需要管理員權限才能訪問此頁面</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              請聯繫伺服器管理員以獲取訪問權限。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">管理員控制台</h1>
            <p className="text-muted-foreground">歷史訊息提取與管理</p>
          </div>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            ← 返回主頁
          </Button>
        </div>

        {/* 摘要卡片 */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>總任務數</CardDescription>
                <CardTitle className="text-3xl">
                  {summary.total_tasks}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  運行中: {summary.running_tasks} | 待處理:{" "}
                  {summary.pending_tasks}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>已提取訊息</CardDescription>
                <CardTitle className="text-3xl">
                  {summary.total_messages_saved?.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  重複: {summary.total_messages_duplicate?.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>完成率</CardDescription>
                <CardTitle className="text-3xl">
                  {summary.total_tasks > 0
                    ? Math.round(
                        (summary.completed_tasks / summary.total_tasks) * 100
                      )
                    : 0}
                  %
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  成功: {summary.completed_tasks} | 失敗: {summary.failed_tasks}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>已處理頻道</CardDescription>
                <CardTitle className="text-3xl">
                  {summary.channels_processed}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  警告: {summary.warning_tasks}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 活躍任務進度 */}
        <FetchProgress guildId={guildId} />

        {/* 標籤切換 */}
        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === "batch" ? "default" : "ghost"}
            onClick={() => setActiveTab("batch")}
          >
            批量提取
          </Button>
          <Button
            variant={activeTab === "channels" ? "default" : "ghost"}
            onClick={() => setActiveTab("channels")}
          >
            頻道列表
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "ghost"}
            onClick={() => setActiveTab("history")}
          >
            提取歷史
          </Button>
        </div>

        {/* 內容區域 */}
        {activeTab === "batch" && (
          <BatchFetch
            guildId={guildId}
            userId={userId}
            channels={channelsForBatch}
            onStartBatch={handleBatchStart}
          />
        )}

        {activeTab === "channels" && (
          <ChannelTree guildId={guildId} userId={userId} />
        )}

        {activeTab === "history" && <FetchHistory guildId={guildId} />}
      </div>
    </div>
  );
}
