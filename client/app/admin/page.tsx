"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/language-switcher";
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

export default function AdminPage() {
  const router = useRouter();
  const { t } = useLanguage();
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
      if (!channelsRes.ok) {
        throw new Error(`獲取頻道失敗: ${channelsRes.status}`);
      }
      const channels = await channelsRes.json();
      console.log("頻道列表:", channels);

      if (!Array.isArray(channels)) {
        console.error("頻道列表不是數組:", channels);
        setChannelsForBatch([]);
        return;
      }

      // 獲取分析數據（可選，失敗不影響顯示）
      let analysis = [];
      try {
        const analysisRes = await fetch(`/api/history/${gid}/analyze`);
        if (analysisRes.ok) {
          const analysisData = await analysisRes.json();
          console.log("分析數據:", analysisData);
          analysis = Array.isArray(analysisData) ? analysisData : [];
        } else {
          console.warn("獲取分析數據失敗，使用預設值");
        }
      } catch (analysisError) {
        console.warn("分析數據請求失敗:", analysisError);
      }

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
      // 設置空數組避免崩潰
      setChannelsForBatch([]);
    }
  };

  const handleBatchStart = async (channelIds: string[]) => {
    console.log("🚀 handleBatchStart 被調用");
    console.log("channelIds:", channelIds);
    console.log("guildId:", guildId);
    console.log("userId:", userId);
    console.log("channelsForBatch:", channelsForBatch);

    if (!guildId || !userId) {
      console.error("❌ 缺少 guildId 或 userId");
      alert("錯誤：缺少必要的參數");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const channelId of channelIds) {
      const channel = channelsForBatch.find((ch) => ch.id === channelId);
      if (!channel) {
        console.warn(`⚠️ 找不到頻道: ${channelId}`);
        continue;
      }

      try {
        console.log(`📥 提取頻道: ${channel.name} (${channel.id})`);

        const url = `/api/fetch/${guildId}/start`;
        const body = {
          channelId: channel.id,
          channelName: channel.name,
          anchorMessageId: "latest",
          userId,
        };

        console.log(`發送請求到: ${url}`);
        console.log("請求內容:", body);

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        console.log(`響應狀態: ${response.status}`);

        const data = await response.json();
        console.log("響應數據:", data);

        if (data.success) {
          console.log(`✅ ${channel.name} 提取任務已開始 (ID: ${data.taskId})`);
          successCount++;
        } else {
          console.error(`❌ ${channel.name} 提取失敗:`, data.error);
          failCount++;
        }

        // 延遲 1 秒避免過快
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ ${channel.name} 提取失敗:`, error);
        failCount++;
      }
    }

    console.log(`📊 批量提取完成: 成功 ${successCount}, 失敗 ${failCount}`);

    alert(
      `✅ 批量提取已完成！\n\n成功: ${successCount}\n失敗: ${failCount}\n\n請切換到「提取歷史」標籤查看進度。`
    );

    // 重新載入數據
    console.log("🔄 重新載入數據...");
    loadSummary(guildId);
    loadChannelsForBatch(guildId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.common.loading}...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t.admin.noPermission}</CardTitle>
            <CardDescription>{t.admin.needAdminPermission}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t.admin.contactAdmin}
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
            <h1 className="text-3xl font-bold">{t.admin.title}</h1>
            <p className="text-muted-foreground">{t.admin.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => router.push("/")}>
              ← {t.admin.backToHome}
            </Button>
          </div>
        </div>

        {/* 摘要卡片 */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t.admin.totalTasks}</CardDescription>
                <CardTitle className="text-3xl">
                  {summary.total_tasks}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.admin.running}:
                    </span>
                    <span className="font-medium text-blue-600">
                      {summary.running_tasks}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.admin.pending}:
                    </span>
                    <span className="font-medium text-yellow-600">
                      {summary.pending_tasks}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t.admin.messagesFetched}</CardDescription>
                <CardTitle className="text-3xl">
                  {summary.total_messages_saved?.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {t.admin.duplicate}:{" "}
                  {summary.total_messages_duplicate?.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t.admin.completionRate}</CardDescription>
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
                  {t.admin.success}: {summary.completed_tasks} |{" "}
                  {t.admin.failed}: {summary.failed_tasks}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t.admin.channelsProcessed}</CardDescription>
                <CardTitle className="text-3xl">
                  {summary.channels_processed}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  {t.admin.warning}: {summary.warning_tasks}
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
            {t.admin.batchFetch}
          </Button>
          <Button
            variant={activeTab === "channels" ? "default" : "ghost"}
            onClick={() => setActiveTab("channels")}
          >
            {t.admin.channelList}
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "ghost"}
            onClick={() => setActiveTab("history")}
          >
            {t.admin.fetchHistory}
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
