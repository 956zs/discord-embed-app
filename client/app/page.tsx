"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { TrendingUp, Hash, Users, Smile, Cloud, BarChart3 } from "lucide-react";
import { DashboardNav } from "@/components/dashboard-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageTrendsChart } from "@/components/charts/message-trends-chart";
import { ChannelUsageChart } from "@/components/charts/channel-usage-chart";
import { KeywordCloud } from "@/components/keyword-cloud";
import type {
  ServerStats,
  MessageTrend,
  ChannelUsage,
  MemberActivity,
  EmojiUsage,
  WordCloudData,
} from "@/types";

export default function Home() {
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [messageTrends, setMessageTrends] = useState<MessageTrend[]>([]);
  const [channelUsage, setChannelUsage] = useState<ChannelUsage[]>([]);
  const [memberActivity, setMemberActivity] = useState<MemberActivity[]>([]);
  const [emojiStats, setEmojiStats] = useState<EmojiUsage[]>([]);
  const [keywords, setKeywords] = useState<WordCloudData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const devGuildId = process.env.NEXT_PUBLIC_DEV_GUILD_ID || "";

    if (devGuildId) {
      fetchAllData(devGuildId);
    } else {
      setError("未設定伺服器 ID");
      setLoading(false);
    }
  }, []);

  const fetchAllData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log("🔄 開始載入資料，Guild ID:", id);

      // 使用相對路徑，透過 Next.js rewrites 代理到後端
      const [server, messages, channels, members, emojis, keywordsData] =
        await Promise.all([
          axios.get(`/api/stats/server/${id}`),
          axios.get(`/api/stats/messages/${id}`),
          axios.get(`/api/stats/channels/${id}`),
          axios.get(`/api/stats/members/${id}`),
          axios.get(`/api/stats/emojis/${id}`),
          axios.get(`/api/stats/keywords/${id}`),
        ]);

      console.log("✅ 資料載入成功");
      setServerStats(server.data);
      setMessageTrends(messages.data);
      setChannelUsage(channels.data);
      setMemberActivity(members.data);
      setEmojiStats(emojis.data);
      setKeywords(keywordsData.data);
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
          <button
            onClick={() => {
              const devGuildId = process.env.NEXT_PUBLIC_DEV_GUILD_ID || "";
              if (devGuildId) fetchAllData(devGuildId);
            }}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center px-6">
          <DashboardNav />
        </div>
      </header>

      <main className="container px-6 py-8">
        <div className="mb-10 space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Discord 伺服器統計
          </h1>
          <p className="text-lg text-muted-foreground">
            查看伺服器的詳細統計資訊和活動分析
          </p>
        </div>

        <div className="space-y-8">
          {/* 伺服器概覽 */}
          <section id="server">
            <Card className="border-2 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <BarChart3 className="h-6 w-6" />
                  {serverStats?.name || "伺服器概覽"}
                </CardTitle>
                <CardDescription className="text-base">
                  伺服器基本資訊統計
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-3 rounded-xl border-2 bg-muted/50 p-6 transition-colors hover:bg-muted/70">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      成員數
                    </p>
                    <p className="text-4xl font-bold">
                      {serverStats?.memberCount || 0}
                    </p>
                  </div>
                  <div className="space-y-3 rounded-xl border-2 bg-muted/50 p-6 transition-colors hover:bg-muted/70">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      頻道數
                    </p>
                    <p className="text-4xl font-bold">
                      {serverStats?.channelCount || 0}
                    </p>
                  </div>
                  <div className="space-y-3 rounded-xl border-2 bg-muted/50 p-6 transition-colors hover:bg-muted/70">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      身分組數
                    </p>
                    <p className="text-4xl font-bold">
                      {serverStats?.roleCount || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 訊息趨勢圖表 */}
          <section id="messages">
            <Card className="border-2 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-5 w-5" />
                  訊息趨勢
                </CardTitle>
                <CardDescription className="text-base">
                  過去 7 天的訊息量和活躍用戶統計
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

          <div className="grid gap-8 lg:grid-cols-2">
            {/* 頻道使用圖表 */}
            <section id="channels">
              <Card className="border-2 shadow-lg">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Hash className="h-5 w-5" />
                    頻道使用統計
                  </CardTitle>
                  <CardDescription className="text-base">
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
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Users className="h-5 w-5" />
                    成員活躍度
                  </CardTitle>
                  <CardDescription className="text-base">
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
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Smile className="h-5 w-5" />
                    表情符號統計
                  </CardTitle>
                  <CardDescription className="text-base">
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

            {/* 關鍵字雲 */}
            <section id="keywords">
              <Card className="border-2 shadow-lg">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Cloud className="h-5 w-5" />
                    關鍵字統計
                  </CardTitle>
                  <CardDescription className="text-base">
                    訊息中最常出現的關鍵字
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <KeywordCloud data={keywords} />
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
