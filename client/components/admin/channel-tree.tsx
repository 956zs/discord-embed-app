"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  Hash,
  Volume2,
  MessageSquare,
  MessagesSquare,
} from "lucide-react";
import type { ChannelFetchStats } from "@/types";

interface Thread {
  id: string;
  name: string;
  type: number;
  archived: boolean;
  locked: boolean;
  messageCount: number;
  createdAt: string;
  parentId: string;
  isThread: boolean;
}

interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
  isThread: boolean;
  threads?: Thread[];
  threadCount?: number;
}

interface ChannelTreeProps {
  guildId: string;
  userId: string;
}

export function ChannelTree({ guildId, userId }: ChannelTreeProps) {
  const { t } = useLanguage();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [fetchStats, setFetchStats] = useState<Map<string, ChannelFetchStats>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(
    new Set()
  );
  const [startingFetch, setStartingFetch] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 緩存鍵
  const CACHE_KEY_CHANNELS = `discord_channels_tree_${guildId}`;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 分鐘（頻道變化不頻繁）

  const toggleChannel = (channelId: string) => {
    const newExpanded = new Set(expandedChannels);
    if (newExpanded.has(channelId)) {
      newExpanded.delete(channelId);
    } else {
      newExpanded.add(channelId);
    }
    setExpandedChannels(newExpanded);
  };

  const loadChannels = async (forceRefresh: boolean = false) => {
    try {
      // 先檢查緩存（除非強制刷新）
      if (!forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY_CHANNELS);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setChannels(data);
            setLoading(false);
            console.log(`✅ 從緩存載入了 ${data.length} 個頻道（含討論串）`);
            return;
          }
        }
      }

      // 從後端 API 獲取頻道列表（bot 提供），包含討論串
      console.log("📡 從 bot 獲取頻道列表（包含討論串，可能需要 10-20 秒）...");
      const response = await fetch(
        `/api/history/${guildId}/channels?includeThreads=true`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const channelList: Channel[] = await response.json();

      // 儲存到緩存
      localStorage.setItem(
        CACHE_KEY_CHANNELS,
        JSON.stringify({ data: channelList, timestamp: Date.now() })
      );

      setChannels(channelList);
      console.log(`✅ 已載入並緩存 ${channelList.length} 個頻道（含討論串）`);
    } catch (error) {
      console.error("載入頻道失敗:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFetchStats = async () => {
    try {
      // 使用相對路徑
      const response = await fetch(`/api/history/${guildId}/channel-stats`);
      const data: ChannelFetchStats[] = await response.json();

      const statsMap = new Map<string, ChannelFetchStats>();
      data.forEach((stat) => statsMap.set(stat.channel_id, stat));
      setFetchStats(statsMap);
    } catch (error) {
      console.error("載入提取統計失敗:", error);
    }
  };

  useEffect(() => {
    loadChannels(false); // 初次載入使用緩存
    loadFetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  // 手動刷新頻道列表
  const refreshChannels = async () => {
    setRefreshing(true);
    localStorage.removeItem(CACHE_KEY_CHANNELS);
    await loadChannels(true);
    await loadFetchStats();
  };

  const startFetch = async (channelId: string, channelName: string) => {
    try {
      setStartingFetch(channelId);

      // 使用 "latest" 作為錨點，bot 會自動獲取最新訊息
      const anchorMessageId = "latest";
      console.log(`📍 使用錨點: ${anchorMessageId}`);

      console.log(`🚀 開始提取任務: ${channelName} (${channelId})`);

      // 使用相對路徑
      const response = await fetch(`/api/fetch/${guildId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          channelName,
          anchorMessageId,
          userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ 提取任務已開始！任務 ID: ${data.taskId}`);
        alert(
          `✅ 提取任務已開始！\n\n任務 ID: ${data.taskId}\n頻道: ${channelName}\n\n請切換到「提取歷史」標籤查看進度。`
        );
        loadFetchStats();
      } else {
        console.error("提取失敗:", data.error);
        alert(`❌ 提取失敗\n\n${data.error || "未知錯誤"}`);
      }
    } catch (error) {
      console.error("開始提取失敗:", error);
      alert(
        `❌ 開始提取失敗\n\n${
          error instanceof Error ? error.message : "未知錯誤"
        }`
      );
    } finally {
      setStartingFetch(null);
    }
  };

  const getChannelIcon = (type: number) => {
    switch (type) {
      case 0:
        return <Hash className="h-4 w-4" />;
      case 2:
        return <Volume2 className="h-4 w-4" />;
      case 15:
        return <MessagesSquare className="h-4 w-4" />; // 論壇頻道
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t.admin.neverFetched2;
    return new Date(dateStr).toLocaleString("zh-TW");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {t.common.loading}...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t.admin.channelList}</CardTitle>
            <CardDescription>{t.admin.selectChannel}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshChannels}
            disabled={refreshing}
          >
            {refreshing ? "刷新中..." : "🔄 刷新頻道"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {channels.map((channel) => {
            const stats = fetchStats.get(channel.id);
            const hasStats = !!stats;
            const hasThreads = (channel.threads?.length || 0) > 0;
            const isExpanded = expandedChannels.has(channel.id);

            return (
              <div key={channel.id} className="space-y-1">
                {/* 主頻道 */}
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    {/* 展開/收起按鈕 */}
                    {hasThreads && (
                      <button
                        onClick={() => toggleChannel(channel.id)}
                        className="hover:bg-muted rounded p-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {getChannelIcon(channel.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{channel.name}</span>
                        {hasThreads && (
                          <span className="text-xs text-muted-foreground">
                            ({channel.threadCount} 個討論串)
                          </span>
                        )}
                      </div>
                      {hasStats && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <div>
                            {t.admin.fetched}:{" "}
                            {stats.total_messages?.toLocaleString()}{" "}
                            {t.stats.messages}
                            {" | "}
                            {t.admin.task}: {stats.completed_tasks}/
                            {stats.total_tasks}
                            {stats.running_tasks > 0 &&
                              ` (${t.admin.running}: ${stats.running_tasks})`}
                          </div>
                          <div>
                            {t.admin.lastFetch}:{" "}
                            {formatDate(stats.last_fetch_time)}
                          </div>
                        </div>
                      )}
                      {!hasStats && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {t.admin.neverFetched2}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => startFetch(channel.id, channel.name)}
                    disabled={startingFetch === channel.id}
                  >
                    {startingFetch === channel.id
                      ? t.admin.starting
                      : t.admin.startFetchTask}
                  </Button>
                </div>

                {/* 討論串列表 */}
                {hasThreads && isExpanded && (
                  <div className="ml-8 space-y-1">
                    {channel.threads?.map((thread) => (
                      <div
                        key={thread.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-dashed hover:bg-accent/50 transition-colors text-sm"
                      >
                        <MessageSquare className="h-3 w-3 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span>{thread.name}</span>
                            {thread.archived && (
                              <span className="text-xs text-muted-foreground">
                                ({t.admin.archived})
                              </span>
                            )}
                            {thread.locked && (
                              <span className="text-xs text-muted-foreground">
                                ({t.admin.locked})
                              </span>
                            )}
                          </div>
                          {thread.messageCount > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {thread.messageCount} {t.stats.messages}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
