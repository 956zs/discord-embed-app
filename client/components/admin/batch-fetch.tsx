"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, AlertCircle } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  type: number;
  lastMessageTime?: string | null;
  lastFetchTime?: string | null;
  messageCount?: number;
  needsUpdate: boolean;
  reason: string;
}

interface BatchFetchProps {
  guildId: string;
  userId: string;
  channels: Channel[];
  onStartBatch: (channelIds: string[]) => Promise<void>;
}

export function BatchFetch({
  guildId,
  userId,
  channels,
  onStartBatch,
}: BatchFetchProps) {
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(
    new Set()
  );
  const [isStarting, setIsStarting] = useState(false);
  const [autoSelectMode, setAutoSelectMode] = useState<
    "all" | "never" | "outdated"
  >("outdated");

  // 根據模式自動選擇頻道
  const autoSelect = (mode: "all" | "never" | "outdated") => {
    setAutoSelectMode(mode);
    const selected = new Set<string>();

    channels.forEach((channel) => {
      if (mode === "all") {
        selected.add(channel.id);
      } else if (mode === "never" && !channel.lastFetchTime) {
        selected.add(channel.id);
      } else if (mode === "outdated" && channel.needsUpdate) {
        selected.add(channel.id);
      }
    });

    setSelectedChannels(selected);
  };

  const toggleChannel = (channelId: string) => {
    const newSelected = new Set(selectedChannels);
    if (newSelected.has(channelId)) {
      newSelected.delete(channelId);
    } else {
      newSelected.add(channelId);
    }
    setSelectedChannels(newSelected);
  };

  const handleStartBatch = async () => {
    if (selectedChannels.size === 0) {
      alert("請至少選擇一個頻道");
      return;
    }

    const confirmed = confirm(
      `確定要開始提取 ${selectedChannels.size} 個頻道的歷史訊息嗎？\n\n這可能需要一些時間，請耐心等待。`
    );

    if (!confirmed) return;

    setIsStarting(true);
    try {
      await onStartBatch(Array.from(selectedChannels));
      setSelectedChannels(new Set());
    } catch (error) {
      console.error("批量提取失敗:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const needsUpdateCount = channels.filter((ch) => ch.needsUpdate).length;
  const neverFetchedCount = channels.filter((ch) => !ch.lastFetchTime).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5" />
          批量提取
        </CardTitle>
        <CardDescription>
          智能識別需要提取的頻道，一鍵批量提取歷史訊息
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 統計信息 */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{channels.length}</div>
            <div className="text-xs text-muted-foreground">總頻道數</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {neverFetchedCount}
            </div>
            <div className="text-xs text-muted-foreground">尚未提取</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {needsUpdateCount}
            </div>
            <div className="text-xs text-muted-foreground">需要更新</div>
          </div>
        </div>

        {/* 快速選擇 */}
        <div className="space-y-2">
          <div className="text-sm font-medium">快速選擇：</div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={autoSelectMode === "outdated" ? "default" : "outline"}
              onClick={() => autoSelect("outdated")}
            >
              需要更新的頻道 ({needsUpdateCount})
            </Button>
            <Button
              size="sm"
              variant={autoSelectMode === "never" ? "default" : "outline"}
              onClick={() => autoSelect("never")}
            >
              尚未提取的頻道 ({neverFetchedCount})
            </Button>
            <Button
              size="sm"
              variant={autoSelectMode === "all" ? "default" : "outline"}
              onClick={() => autoSelect("all")}
            >
              全部頻道 ({channels.length})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedChannels(new Set())}
            >
              清除選擇
            </Button>
          </div>
        </div>

        {/* 頻道列表 */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {channels.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              沒有可用的頻道
            </div>
          ) : (
            channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <Checkbox
                  checked={selectedChannels.has(channel.id)}
                  onCheckedChange={() => toggleChannel(channel.id)}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{channel.name}</span>
                    {channel.needsUpdate && (
                      <Badge variant="default" className="bg-orange-500">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        需要更新
                      </Badge>
                    )}
                    {!channel.lastFetchTime && (
                      <Badge variant="default" className="bg-yellow-500">
                        未提取
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground mt-1">
                    {channel.reason}
                  </div>

                  {channel.lastFetchTime && (
                    <div className="text-xs text-muted-foreground">
                      最後提取:{" "}
                      {new Date(channel.lastFetchTime).toLocaleString("zh-TW")}
                    </div>
                  )}
                </div>

                {channel.messageCount !== undefined && (
                  <div className="text-sm text-muted-foreground">
                    {channel.messageCount.toLocaleString()} 則
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 開始按鈕 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            已選擇 {selectedChannels.size} 個頻道
          </div>
          <Button
            onClick={handleStartBatch}
            disabled={selectedChannels.size === 0 || isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                啟動中...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                開始批量提取
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
