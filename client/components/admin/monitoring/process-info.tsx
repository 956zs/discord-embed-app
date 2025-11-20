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
          rss: number; // 進程實際記憶體使用（RSS）
          heap: number; // V8 heap 使用量
          heapTotal: number; // V8 heap 總量
          external: number; // C++ objects
          processPercentage: number; // heap used / heap total
          system: {
            total: number; // 系統總記憶體
            free: number; // 系統可用記憶體
            used: number; // 系統已用記憶體
            percentage: number; // 系統記憶體使用率
          };
        };
      };
      pm2?: {
        status: string;
        mode: string;
        count: number;
        processes: Array<{
          name: string;
          pid: number;
          status: string;
          uptime: number;
          restarts: number;
          cpu: number;
          memory: number;
        }>;
        summary: {
          totalCpu: number;
          totalMemory: number;
          totalRestarts: number;
          allRunning: boolean;
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

  // 從 PM2 資訊獲取進程模式
  const pm2Info = health.services.pm2;
  const processMode = pm2Info?.mode || "unknown";
  const isSingleProcess = processMode === "single";
  const processCount = pm2Info?.count || 0;

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
                {processMode === "single"
                  ? t.monitoring.singleProcess
                  : processMode === "dual"
                  ? t.monitoring.dualProcess
                  : t.monitoring.unknownMode}
              </Badge>
              <Badge variant="outline">{processCount} 進程</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {pm2Info?.summary.allRunning
                ? "✅ 所有進程運行正常"
                : "⚠️ 部分進程異常"}
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
              {health.services.system.memory.rss}MB
            </div>
            <p className="text-xs text-muted-foreground">
              Heap: {health.services.system.memory.heap}MB /{" "}
              {health.services.system.memory.heapTotal}MB (
              {health.services.system.memory.processPercentage.toFixed(1)}%)
            </p>
            <p className="text-xs text-muted-foreground">
              系統: {health.services.system.memory.system.used.toLocaleString()}
              MB / {health.services.system.memory.system.total.toLocaleString()}
              MB ({health.services.system.memory.system.percentage.toFixed(1)}%)
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
