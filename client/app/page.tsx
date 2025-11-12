"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { TrendingUp, Hash, Users, Smile, BarChart3 } from "lucide-react";
import { DashboardNav } from "@/components/dashboard-nav";
import { UserInfo } from "@/components/user-info";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageTrendsChart } from "@/components/charts/message-trends-chart";
import { ChannelUsageChart } from "@/components/charts/channel-usage-chart";
import type {
  ServerStats,
  MessageTrend,
  ChannelUsage,
  MemberActivity,
  EmojiUsage,
} from "@/types";

export default function Home() {
  const [guildId, setGuildId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [messageTrends, setMessageTrends] = useState<MessageTrend[]>([]);
  const [channelUsage, setChannelUsage] = useState<ChannelUsage[]>([]);
  const [memberActivity, setMemberActivity] = useState<MemberActivity[]>([]);
  const [emojiStats, setEmojiStats] = useState<EmojiUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("all"); // 新增：時間範圍

  // 獲取時間範圍的顯示文字
  const getTimeRangeText = () => {
    switch (timeRange) {
      case "7":
        return "過去 7 天";
      case "30":
        return "過去 30 天";
      case "90":
        return "過去 90 天";
      case "180":
        return "過去 180 天";
      case "365":
        return "過去一年";
      case "all":
        return "所有時間";
      default:
        return "所有時間";
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        // 開發模式檢查
        const isDev = process.env.NODE_ENV === "development";
        const enableDevMode =
          process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === "true";

        let gid: string | null = null;
        let uid: string | null = null;
        let username: string | null = null;

        if (isDev && enableDevMode) {
          // 開發模式：使用環境變數
          gid = process.env.NEXT_PUBLIC_DEV_GUILD_ID || null;
          uid = process.env.NEXT_PUBLIC_DEV_USER_ID || null;
          username = "Dev User"; // 開發模式的預設用戶名
          console.log("🔧 開發模式:", { gid, uid, username });
        } else {
          // 生產模式：從 Discord SDK 獲取
          try {
            const { getDiscordContext } = await import("@/lib/discord-sdk");
            const context = await getDiscordContext();

            gid = context.guildId;
            uid = context.userId;
            username = context.username;

            console.log("📱 Discord SDK:", { gid, uid, username });
          } catch (sdkError) {
            console.error("Discord SDK 初始化失敗:", sdkError);

            // 降級：嘗試從 URL 參數獲取
            const urlParams = new URLSearchParams(window.location.search);
            gid = urlParams.get("guild_id");
            uid = urlParams.get("user_id");

            console.log("📍 從 URL 獲取:", { gid, uid });

            // 如果還是沒有，且在開發環境，使用環境變數作為最後後備
            if (isDev && (!gid || !uid)) {
              gid = gid || process.env.NEXT_PUBLIC_DEV_GUILD_ID || null;
              uid = uid || process.env.NEXT_PUBLIC_DEV_USER_ID || null;
              username = username || "Dev User";
              console.log("🔧 使用環境變數作為後備:", { gid, uid, username });
            }
          }
        }

        if (gid) {
          setGuildId(gid);
          setUserId(uid);
          setUsername(username);
          fetchAllData(gid);

          // 檢查管理員權限
          if (uid) {
            console.log("🔍 開始檢查管理員權限:", { gid, uid });
            await checkAdminStatus(gid, uid);
          } else {
            console.warn("⚠️ 沒有 user_id，無法檢查管理員權限");
          }
        } else {
          console.warn("⚠️ 未找到 Guild ID");
          setError("此應用需要在 Discord 伺服器中開啟");
          setLoading(false);
        }
      } catch (error) {
        console.error("初始化失敗:", error);
        setError("應用初始化失敗");
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // 當時間範圍改變時重新加載數據
  useEffect(() => {
    if (guildId) {
      fetchAllData(guildId, timeRange);
    }
  }, [timeRange]);

  const checkAdminStatus = async (gid: string, uid: string) => {
    try {
      console.log("📡 發送管理員檢查請求:", { gid, uid });
      const response = await axios.get(
        `/api/history/${gid}/admins/${uid}/check`
      );
      console.log("✅ 管理員檢查響應:", response.data);
      setIsAdmin(response.data.isAdmin);

      if (response.data.isAdmin) {
        console.log("🎉 用戶是管理員！");
      } else {
        console.log("ℹ️ 用戶不是管理員");
      }
    } catch (error) {
      console.error("❌ 檢查管理員狀態失敗:", error);
    }
  };

  const fetchAllData = async (id: string, range: string = "all") => {
    setLoading(true);
    setError(null);
    try {
      console.log("🔄 開始載入資料，Guild ID:", id, "時間範圍:", range);

      // 根據時間範圍設置參數
      const daysParam = range === "all" ? "" : `?days=${range}`;

      // 使用相對路徑，透過 Next.js rewrites 代理到後端
      const [server, messages, channels, members, emojis] = await Promise.all([
        axios.get(`/api/stats/server/${id}`),
        axios.get(`/api/stats/messages/${id}${daysParam}`),
        axios.get(`/api/stats/channels/${id}`),
        axios.get(`/api/stats/members/${id}${daysParam}`),
        axios.get(`/api/stats/emojis/${id}${daysParam}`),
      ]);

      console.log("✅ 資料載入成功");
      setServerStats(server.data);
      setMessageTrends(messages.data);
      setChannelUsage(channels.data);
      setMemberActivity(members.data);
      setEmojiStats(emojis.data);
    } catch (error: any) {
      console.error("❌ 載入資料失敗:", error);
      const errorMsg =
        error.response?.data?.error || error.message || "未知錯誤";
      setError(`載入資料失敗: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <div className="text-2xl font-bold">載入中...</div>
          <div className="text-muted-foreground">正在獲取伺服器統計資料</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-4 text-center">
          <div className="text-2xl font-bold text-destructive">載入失敗</div>
          <div className="text-muted-foreground">{error}</div>
          {guildId && (
            <button
              onClick={() => fetchAllData(guildId)}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              重試
            </button>
          )}
          {!guildId && (
            <div className="text-sm text-muted-foreground">
              請在 Discord 伺服器中開啟此活動
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-6 gap-4">
          <UserInfo username={username} userId={userId} isAdmin={isAdmin} />
          <DashboardNav isAdmin={isAdmin} />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* 開發模式調試面板 */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border text-xs space-y-2">
            <div className="font-semibold">🔍 調試信息</div>
            <div className="grid grid-cols-2 gap-2">
              <div>Guild ID: {guildId || "❌"}</div>
              <div>User ID: {userId || "❌"}</div>
              <div>Username: {username || "❌"}</div>
              <div>
                Is Admin:{" "}
                {isAdmin ? (
                  <span className="text-green-600 font-bold">✅ 是</span>
                ) : (
                  <span className="text-red-600 font-bold">❌ 否</span>
                )}
              </div>
            </div>
            <div className="text-muted-foreground">
              打開瀏覽器控制台 (F12) 查看詳細日誌
            </div>
          </div>
        )}

        <div className="mb-6 md:mb-10 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
                {serverStats?.name || "Discord 伺服器統計"}
              </h1>
              <p className="text-sm md:text-lg text-muted-foreground">
                {guildId
                  ? "查看伺服器的詳細統計資訊和活動分析"
                  : "請在 Discord 伺服器中開啟此活動"}
              </p>
            </div>

            {/* 時間範圍選擇器 */}
            {guildId && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  時間範圍:
                </span>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="flex-1 md:flex-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="7">最近 7 天</option>
                  <option value="30">最近 30 天</option>
                  <option value="90">最近 90 天</option>
                  <option value="180">最近 180 天</option>
                  <option value="365">最近一年</option>
                  <option value="all">所有時間</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          {/* 伺服器概覽 */}
          <section id="server">
            <Card className="border-2 shadow-lg">
              <CardHeader className="pb-4 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                  <BarChart3 className="h-5 w-5 md:h-6 md:w-6" />
                  伺服器概覽
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  {serverStats?.name || "伺服器基本資訊統計"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {serverStats ? (
                  <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2 md:space-y-3 rounded-xl border-2 bg-muted/50 p-4 md:p-6 transition-colors hover:bg-muted/70">
                      <p className="text-xs md:text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        成員數
                      </p>
                      <p className="text-3xl md:text-4xl font-bold">
                        {serverStats.memberCount}
                      </p>
                    </div>
                    <div className="space-y-2 md:space-y-3 rounded-xl border-2 bg-muted/50 p-4 md:p-6 transition-colors hover:bg-muted/70">
                      <p className="text-xs md:text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        頻道數
                      </p>
                      <p className="text-3xl md:text-4xl font-bold">
                        {serverStats.channelCount}
                      </p>
                    </div>
                    <div className="space-y-2 md:space-y-3 rounded-xl border-2 bg-muted/50 p-4 md:p-6 transition-colors hover:bg-muted/70 sm:col-span-2 lg:col-span-1">
                      <p className="text-xs md:text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        身分組數
                      </p>
                      <p className="text-3xl md:text-4xl font-bold">
                        {serverStats.roleCount}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-muted-foreground">
                    無法載入伺服器資訊
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* 訊息趨勢圖表 */}
          <section id="messages">
            <Card className="border-2 shadow-lg">
              <CardHeader className="pb-4 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
                  訊息趨勢
                </CardTitle>
                <CardDescription className="text-sm md:text-base">
                  {getTimeRangeText()}的訊息量和活躍用戶統計
                </CardDescription>
              </CardHeader>
              <CardContent>
                {messageTrends.length > 0 ? (
                  <MessageTrendsChart data={messageTrends} />
                ) : (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    暫無訊息趨勢資料
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* 頻道使用圖表 */}
            <section id="channels">
              <Card className="border-2 shadow-lg">
                <CardHeader className="pb-4 md:pb-6">
                  <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                    <Hash className="h-5 w-5 md:h-6 md:w-6" />
                    頻道使用統計
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    各頻道的訊息數量
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {channelUsage.length > 0 ? (
                    <ChannelUsageChart data={channelUsage.slice(0, 10)} />
                  ) : (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                      暫無頻道使用資料
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* 成員活躍度 */}
            <section id="members">
              <Card className="border-2 shadow-lg">
                <CardHeader className="pb-4 md:pb-6">
                  <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                    <Users className="h-5 w-5 md:h-6 md:w-6" />
                    成員活躍度
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    發言次數排行榜 Top 10
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {memberActivity.length > 0 ? (
                    <div className="space-y-3">
                      {memberActivity.slice(0, 10).map((member, index) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-lg border-2 bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-4">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="text-sm font-semibold">
                              {member.username}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            {member.messageCount.toLocaleString()} 則
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                      暫無成員活躍度資料
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* 表情符號統計 */}
            <section id="emojis">
              <Card className="border-2 shadow-lg">
                <CardHeader className="pb-4 md:pb-6">
                  <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
                    <Smile className="h-5 w-5 md:h-6 md:w-6" />
                    表情符號統計
                  </CardTitle>
                  <CardDescription className="text-sm md:text-base">
                    最常使用的表情符號 Top 10
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {emojiStats.length > 0 ? (
                    <div className="space-y-3">
                      {emojiStats.slice(0, 10).map((emoji, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border-2 bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-4">
                            {emoji.isCustom && emoji.url ? (
                              <img
                                src={emoji.url}
                                alt={emoji.name}
                                className="h-6 w-6"
                              />
                            ) : (
                              <span className="text-2xl">{emoji.emoji}</span>
                            )}
                            <span className="text-sm font-semibold">
                              {emoji.name}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            {emoji.count.toLocaleString()} 次
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                      暫無表情符號資料
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
