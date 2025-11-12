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
import {
  ChevronRight,
  ChevronDown,
  Hash,
  Volume2,
  MessageSquare,
} from "lucide-react";
import type { ChannelFetchStats } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3008";

interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
}

interface ChannelTreeProps {
  guildId: string;
  userId: string;
}

export function ChannelTree({ guildId, userId }: ChannelTreeProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [fetchStats, setFetchStats] = useState<Map<string, ChannelFetchStats>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [startingFetch, setStartingFetch] = useState<string | null>(null);

  useEffect(() => {
    loadChannels();
    loadFetchStats();
  }, [guildId]);

  const loadChannels = async () => {
    try {
      // 這裡需要從 Discord API 或你的後端獲取頻道列表
      // 暫時使用模擬數據
      const mockChannels: Channel[] = [
        { id: "1", name: "一般", type: 0, position: 0 },
        { id: "2", name: "閒聊", type: 0, position: 1 },
        { id: "3", name: "公告", type: 0, position: 2 },
      ];
      setChannels(mockChannels);
    } catch (error) {
      console.error("載入頻道失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFetchStats = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/history/${guildId}/channel-stats`
      );
      const data: ChannelFetchStats[] = await response.json();

      const statsMap = new Map<string, ChannelFetchStats>();
      data.forEach((stat) => statsMap.set(stat.channel_id, stat));
      setFetchStats(statsMap);
    } catch (error) {
      console.error("載入提取統計失敗:", error);
    }
  };

  const startFetch = async (channelId: string, channelName: string) => {
    try {
      setStartingFetch(channelId);

      // 獲取最新訊息作為錨點
      const anchorMessageId = "latest"; // 實際應該從 Discord API 獲取

      const response = await fetch(`${API_URL}/api/fetch/${guildId}/start`, {
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
        alert(`提取任務已開始！任務 ID: ${data.taskId}`);
        loadFetchStats();
      } else {
        alert(`提取失敗: ${data.error}`);
      }
    } catch (error) {
      console.error("開始提取失敗:", error);
      alert("開始提取失敗");
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
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "從未提取";
    return new Date(dateStr).toLocaleString("zh-TW");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">載入中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>頻道列表</CardTitle>
        <CardDescription>選擇頻道開始提取歷史訊息</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {channels.map((channel) => {
            const stats = fetchStats.get(channel.id);
            const hasStats = !!stats;

            return (
              <div
                key={channel.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getChannelIcon(channel.type)}
                  <div className="flex-1">
                    <div className="font-medium">{channel.name}</div>
                    {hasStats && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <div>
                          已提取: {stats.total_messages?.toLocaleString()}{" "}
                          則訊息
                          {" | "}
                          任務: {stats.completed_tasks}/{stats.total_tasks}
                          {stats.running_tasks > 0 &&
                            ` (運行中: ${stats.running_tasks})`}
                        </div>
                        <div>最後提取: {formatDate(stats.last_fetch_time)}</div>
                      </div>
                    )}
                    {!hasStats && (
                      <div className="text-xs text-muted-foreground mt-1">
                        尚未提取過歷史訊息
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => startFetch(channel.id, channel.name)}
                  disabled={startingFetch === channel.id}
                >
                  {startingFetch === channel.id ? "啟動中..." : "開始提取"}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
