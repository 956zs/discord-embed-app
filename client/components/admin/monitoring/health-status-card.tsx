"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Bot,
  Server,
} from "lucide-react";

interface HealthStatusCardProps {
  health: {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptime: number;
    services: {
      database: {
        status: string;
        responseTime: number;
        connections?: {
          total: number;
          active: number;
          idle: number;
        };
      };
      discordBot: {
        status: string;
        websocket?: string;
        guilds?: number;
        latency?: number;
      };
      system: {
        cpu: number;
        memory: {
          rss: number;
          heap: number;
          heapTotal: number;
          external: number;
          processPercentage: number;
          system: {
            total: number;
            free: number;
            used: number;
            percentage: number;
          };
        };
        eventLoopDelay?: number;
      };
    };
  } | null;
}

export function HealthStatusCard({ health }: HealthStatusCardProps) {
  const { t } = useLanguage();

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.monitoring.healthStatus}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t.monitoring.noData}</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "healthy":
        return "text-green-600";
      case "degraded":
        return "text-yellow-600";
      case "unhealthy":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "unhealthy":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant =
      status.toLowerCase() === "healthy"
        ? "default"
        : status.toLowerCase() === "degraded"
        ? "secondary"
        : "destructive";

    const statusKey = status.toLowerCase() as
      | "healthy"
      | "degraded"
      | "unhealthy";
    const statusText = t.monitoring[statusKey] || status;

    return (
      <Badge variant={variant} className="ml-2">
        {statusText}
      </Badge>
    );
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}${t.monitoring.days} ${hours}${t.monitoring.hours}`;
    } else if (hours > 0) {
      return `${hours}${t.monitoring.hours} ${minutes}${t.monitoring.minutes}`;
    } else {
      return `${minutes}${t.monitoring.minutes}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(health.status)}
            {t.monitoring.healthStatus}
            {getStatusBadge(health.status)}
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            {t.monitoring.uptime}: {formatUptime(health.uptime)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {/* 資料庫狀態 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t.monitoring.database}</span>
              <span className={getStatusColor(health.services.database.status)}>
                {getStatusIcon(health.services.database.status)}
              </span>
            </div>
            <div className="text-sm space-y-1 pl-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t.monitoring.responseTime}:
                </span>
                <span className="font-medium">
                  {health.services.database.responseTime}ms
                </span>
              </div>
              {health.services.database.connections && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.monitoring.activeConnections}:
                    </span>
                    <span className="font-medium">
                      {health.services.database.connections.active}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t.monitoring.idleConnections}:
                    </span>
                    <span className="font-medium">
                      {health.services.database.connections.idle}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Discord Bot 狀態 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{t.monitoring.discordBot}</span>
              <span
                className={getStatusColor(health.services.discordBot.status)}
              >
                {getStatusIcon(health.services.discordBot.status)}
              </span>
            </div>
            <div className="text-sm space-y-1 pl-6">
              {health.services.discordBot.websocket && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WebSocket:</span>
                  <span className="font-medium">
                    {health.services.discordBot.websocket}
                  </span>
                </div>
              )}
              {health.services.discordBot.guilds !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t.monitoring.guilds}:
                  </span>
                  <span className="font-medium">
                    {health.services.discordBot.guilds}
                  </span>
                </div>
              )}
              {health.services.discordBot.latency !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t.monitoring.latency}:
                  </span>
                  <span className="font-medium">
                    {health.services.discordBot.latency}ms
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 系統資源 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {t.monitoring.systemResources}
              </span>
            </div>
            <div className="text-sm space-y-1 pl-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU:</span>
                <span
                  className={`font-medium ${
                    health.services.system.cpu > 80
                      ? "text-red-600"
                      : health.services.system.cpu > 60
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {health.services.system.cpu.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">進程記憶體:</span>
                <span className="font-medium">
                  {health.services.system.memory.rss}MB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heap:</span>
                <span
                  className={`font-medium ${
                    health.services.system.memory.processPercentage > 80
                      ? "text-red-600"
                      : health.services.system.memory.processPercentage > 60
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {health.services.system.memory.heap}MB /{" "}
                  {health.services.system.memory.heapTotal}MB (
                  {health.services.system.memory.processPercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">系統記憶體:</span>
                <span
                  className={`font-medium ${
                    health.services.system.memory.system.percentage > 80
                      ? "text-red-600"
                      : health.services.system.memory.system.percentage > 60
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {health.services.system.memory.system.percentage.toFixed(1)}%
                </span>
              </div>
              {health.services.system.eventLoopDelay !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t.monitoring.eventLoopDelay}:
                  </span>
                  <span
                    className={`font-medium ${
                      health.services.system.eventLoopDelay > 100
                        ? "text-red-600"
                        : health.services.system.eventLoopDelay > 50
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {health.services.system.eventLoopDelay.toFixed(2)}ms
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
