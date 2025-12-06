"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { HealthStatusCard } from "@/components/admin/monitoring/health-status-card";
import { MetricsCharts } from "@/components/admin/monitoring/metrics-charts";
import { AlertsList } from "@/components/admin/monitoring/alerts-list";
import { ProcessInfo } from "@/components/admin/monitoring/process-info";
import { AlertSettings } from "@/components/admin/monitoring/alert-settings";

interface HealthData {
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
  metrics?: {
    apiRequests: number;
    discordEvents: number;
    dbQueries: number;
  };
}

interface MetricsData {
  current: any;
  historical: any[];
  summary: any;
}

interface Alert {
  id: number;
  level: "ERROR" | "WARN" | "INFO";
  message: string;
  details: any;
  triggeredAt: string;
  status: "active" | "resolved";
}

export default function MonitoringPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [guildId, setGuildId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [timePeriod, setTimePeriod] = useState<"1h" | "6h" | "24h">("1h");

  useEffect(() => {
    const initMonitoring = async () => {
      try {
        const isDev = process.env.NODE_ENV === "development";
        const enableDevMode =
          process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === "true";

        let gid: string | null = null;
        let uid: string | null = null;

        if (isDev && enableDevMode) {
          gid = process.env.NEXT_PUBLIC_DEV_GUILD_ID || null;
          uid = process.env.NEXT_PUBLIC_DEV_USER_ID || null;
        } else {
          try {
            const { getDiscordContext } = await import("@/lib/discord-sdk");
            const context = await getDiscordContext();
            gid = context.guildId;
            uid = context.userId;
          } catch (sdkError) {
            const params = new URLSearchParams(window.location.search);
            gid = params.get("guild_id");
            uid = params.get("user_id");

            if (isDev && (!gid || !uid)) {
              gid = gid || process.env.NEXT_PUBLIC_DEV_GUILD_ID || null;
              uid = uid || process.env.NEXT_PUBLIC_DEV_USER_ID || null;
            }
          }
        }

        setGuildId(gid || "");
        setUserId(uid || "");

        if (gid && uid) {
          await checkAdminStatus(gid, uid);
          await fetchData();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("監控頁面初始化失敗:", error);
        setLoading(false);
      }
    };

    initMonitoring();
  }, []);

  // 自動更新邏輯（30 秒間隔）
  useEffect(() => {
    if (autoRefresh && isAdmin) {
      const interval = setInterval(() => {
        fetchData();
      }, 30000); // 30 秒

      return () => clearInterval(interval);
    }
  }, [autoRefresh, isAdmin]);

  const checkAdminStatus = async (gid: string, uid: string) => {
    try {
      const response = await fetch(`/api/history/${gid}/admins/${uid}/check`);
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    } catch (error) {
      console.error("檢查管理員狀態失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (refreshing) return;
    setRefreshing(true);

    try {
      // 並行獲取所有數據
      const [healthRes, metricsRes, alertsRes] = await Promise.all([
        fetch("/health"),
        fetch(`/api/metrics?period=${timePeriod}`),
        fetch("/api/metrics/alerts?limit=50"),
      ]);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        console.log(
          "[Monitoring] ✅ Metrics fetched successfully:",
          metricsData
        );
        setMetrics(metricsData);
      } else {
        console.error(
          "[Monitoring] ❌ Failed to fetch metrics:",
          metricsRes.status,
          metricsRes.statusText
        );
        const errorText = await metricsRes.text();
        console.error("[Monitoring] ❌ Error response:", errorText);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        console.log("[Monitoring] ✅ Alerts fetched successfully");
        setAlerts(alertsData.alerts || []);
      } else {
        console.error(
          "[Monitoring] ❌ Failed to fetch alerts:",
          alertsRes.status
        );
      }
    } catch (error) {
      console.error("獲取監控數據失敗:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchData();
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
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{t.admin.noPermission}</h2>
          <p className="text-muted-foreground mb-4">
            {t.admin.needAdminPermission}
          </p>
          <Button onClick={() => router.push("/admin")}>
            {t.admin.backToHome}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl mt-12 md:mt-0">
        {/* 頁面標題 */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t.monitoring.title}</h1>
            <p className="text-muted-foreground">{t.monitoring.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              {t.monitoring.refresh}
            </Button>
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => router.push("/admin")}>
              ← {t.admin.backToHome}
            </Button>
          </div>
        </div>

        {/* 自動更新開關 */}
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-muted-foreground">
              {t.monitoring.autoRefresh} (30{t.monitoring.seconds})
            </span>
          </label>
          {refreshing && (
            <span className="text-xs text-muted-foreground">
              {t.monitoring.updating}...
            </span>
          )}
        </div>

        {/* 健康狀態卡片 */}
        <HealthStatusCard health={health} />

        {/* 進程資訊 */}
        <ProcessInfo health={health} />

        {/* 指標圖表 */}
        <MetricsCharts
          metrics={metrics}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
        />

        {/* 告警列表 */}
        <AlertsList alerts={alerts} />

        {/* 告警設定 */}
        <AlertSettings />
      </div>
    </div>
  );
}
