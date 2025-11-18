"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { Server, Layers, Clock, MemoryStick } from "lucide-react";

interface ProcessInfoProps {
  health: {
    status: string;
    timestamp: string;
    uptime: number;
    services: {
      system: {
        cpu: number;
        memory: {
          used: number;
          total: number;
          percentage: number;
        };
      };
    };
    metrics?: {
      apiRequests: number;
      discordEvents: number;
      dbQueries: number;
    };
  } | null;
}

export function ProcessInfo({ health }: ProcessInfoProps) {
  const { t } = useLanguage();

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.monitoring.processInfo}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t.monitoring.noData}</p>
        </CardContent>
      </Card>
    );
  }

  // 檢測進程模式（從環境變數或其他來源）
  const processMode = process.env.NEXT_PUBLIC_PROCESS_MODE || "dual";
  const isSingleProcess = processMode === "single";

  // 格式化運行時間
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}${t.monitoring.days}`);
    if (hours > 0) parts.push(`${hours}${t.monitoring.hours}`);
    if (minutes > 0) parts.push(`${minutes}${t.monitoring.minutes}`);

    return parts.join(" ") || `0${t.monitoring.minutes}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          {t.monitoring.processInfo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 進程模式 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span>{t.monitoring.processMode}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isSingleProcess ? "secondary" : "default"}>
                {isSingleProcess
                  ? t.monitoring.singleProcess
                  : t.monitoring.dualProcess}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isSingleProcess
                ? t.monitoring.singleProcessDesc
                : t.monitoring.dualProcessDesc}
            </p>
          </div>

          {/* 運行時間 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{t.monitoring.uptime}</span>
            </div>
            <div className="text-2xl font-bold">
              {formatUptime(health.uptime)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t.monitoring.lastRestart}:{" "}
              {new Date(Date.now() - health.uptime * 1000).toLocaleString(
                "zh-TW"
              )}
            </p>
          </div>

          {/* 記憶體使用 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MemoryStick className="h-4 w-4" />
              <span>{t.monitoring.memoryUsage}</span>
            </div>
            <div className="text-2xl font-bold">
              {health.services.system.memory.used}MB
            </div>
            <p className="text-xs text-muted-foreground">
              {t.monitoring.total}: {health.services.system.memory.total}MB (
              {health.services.system.memory.percentage.toFixed(1)}%)
            </p>
          </div>

          {/* 活動統計 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Server className="h-4 w-4" />
              <span>{t.monitoring.activityStats}</span>
            </div>
            {health.metrics ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t.monitoring.apiRequests}:
                  </span>
                  <span className="font-medium">
                    {health.metrics.apiRequests.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t.monitoring.discordEvents}:
                  </span>
                  <span className="font-medium">
                    {health.metrics.discordEvents.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t.monitoring.dbQueries}:
                  </span>
                  <span className="font-medium">
                    {health.metrics.dbQueries.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t.monitoring.noData}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
