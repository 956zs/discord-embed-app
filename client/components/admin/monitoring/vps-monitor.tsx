"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Server,
  Cpu,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Settings,
  Bell,
} from "lucide-react";

interface VpsMetrics {
  memory: {
    totalMB: number;
    usedMB: number;
    freeMB: number;
    usedPercent: number;
  };
  cpu: {
    count: number;
    usage: number;
  };
  load: {
    avg1: number;
    avg5: number;
    avg15: number;
  };
  uptime: number;
  platform: string;
  hostname: string;
  timestamp: number;
}

interface VpsConfig {
  interval: number;
  thresholds: {
    memory: {
      warnMB: number;
      errorMB: number;
    };
    memoryPercent: {
      warn: number;
      error: number;
    };
  };
  cooldownPeriod: number;
}

interface VpsAlert {
  id: number;
  level: "ERROR" | "WARN" | "INFO";
  message: string;
  details: any;
  triggeredAt: string;
  source: string;
}

interface VpsMonitorProps {
  onRefresh?: () => void;
}

export function VpsMonitor({ onRefresh }: VpsMonitorProps) {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState<VpsMetrics | null>(null);
  const [config, setConfig] = useState<VpsConfig | null>(null);
  const [alerts, setAlerts] = useState<VpsAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // 編輯用的臨時設定
  const [editConfig, setEditConfig] = useState({
    memoryWarnMB: 8192,
    memoryErrorMB: 10240,
    memoryPercentWarn: 80,
    memoryPercentError: 90,
  });

  useEffect(() => {
    fetchVpsData();
  }, []);

  const fetchVpsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [metricsRes, configRes, alertsRes] = await Promise.all([
        fetch("/api/metrics/vps"),
        fetch("/api/metrics/vps/config"),
        fetch("/api/metrics/vps/alerts?limit=10"),
      ]);

      if (metricsRes.status === 503) {
        setError("VPS 監控系統未啟用。請在 .env 中設定 ENABLE_VPS_MONITORING=true");
        setLoading(false);
        return;
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.current);
      }

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data.config);
        setEditConfig({
          memoryWarnMB: data.config.thresholds.memory.warnMB,
          memoryErrorMB: data.config.thresholds.memory.errorMB,
          memoryPercentWarn: data.config.thresholds.memoryPercent.warn,
          memoryPercentError: data.config.thresholds.memoryPercent.error,
        });
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      setError("無法連接到 VPS 監控服務");
      console.error("VPS 監控數據獲取失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/metrics/vps/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editConfig),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        setShowSettings(false);

        // 顯示儲存結果
        if (data.savedToDatabase) {
          alert("設定已儲存到資料庫，重啟後依然生效");
        } else {
          alert("設定已更新，但資料庫儲存失敗（請確認已執行 SQL 遷移腳本）");
        }
      } else {
        const errorData = await response.json();
        alert(`儲存失敗: ${errorData.message || errorData.error}`);
      }
    } catch (err) {
      console.error("儲存設定失敗:", err);
      alert("儲存設定失敗");
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/metrics/vps/webhook/test", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        alert("測試通知發送成功！");
      } else {
        alert(`測試失敗: ${data.message || data.error}`);
      }
    } catch (err) {
      console.error("測試 Webhook 失敗:", err);
      alert("測試 Webhook 失敗");
    } finally {
      setTesting(false);
    }
  };

  const formatBytes = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb} MB`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days} 天 ${hours} 小時`;
    }
    if (hours > 0) {
      return `${hours} 小時 ${minutes} 分鐘`;
    }
    return `${minutes} 分鐘`;
  };

  const getMemoryStatus = (usedMB: number, config: VpsConfig | null) => {
    if (!config) return "normal";
    if (usedMB >= config.thresholds.memory.errorMB) return "error";
    if (usedMB >= config.thresholds.memory.warnMB) return "warn";
    return "normal";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            VPS 主機監控
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">載入中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            VPS 主機監控
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const memoryStatus = metrics ? getMemoryStatus(metrics.memory.usedMB, config) : "normal";

  return (
    <div className="space-y-4">
      {/* VPS 狀態卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              VPS 主機監控
              {metrics && (
                <Badge variant="outline" className="ml-2">
                  {metrics.hostname}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4 mr-1" />
                設定
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchVpsData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 記憶體使用量 */}
              <div className={`p-4 rounded-lg border ${
                memoryStatus === "error"
                  ? "border-red-500 bg-red-500/10"
                  : memoryStatus === "warn"
                  ? "border-yellow-500 bg-yellow-500/10"
                  : "border-border"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">記憶體使用量</span>
                  {memoryStatus === "error" && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  {memoryStatus === "warn" && (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  {memoryStatus === "normal" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-2xl font-bold">{formatBytes(metrics.memory.usedMB)}</p>
                <p className="text-sm text-muted-foreground">
                  / {formatBytes(metrics.memory.totalMB)} ({metrics.memory.usedPercent}%)
                </p>
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      memoryStatus === "error"
                        ? "bg-red-500"
                        : memoryStatus === "warn"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(metrics.memory.usedPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* CPU 使用率 */}
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">CPU 使用率</span>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{metrics.cpu.usage}%</p>
                <p className="text-sm text-muted-foreground">
                  {metrics.cpu.count} 核心
                </p>
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      metrics.cpu.usage > 90
                        ? "bg-red-500"
                        : metrics.cpu.usage > 70
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.min(metrics.cpu.usage, 100)}%` }}
                  />
                </div>
              </div>

              {/* 系統負載 */}
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">系統負載</span>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{metrics.load.avg1}</p>
                <p className="text-sm text-muted-foreground">
                  5m: {metrics.load.avg5} | 15m: {metrics.load.avg15}
                </p>
              </div>

              {/* 系統運行時間 */}
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">系統運行時間</span>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{formatUptime(metrics.uptime)}</p>
                <p className="text-sm text-muted-foreground">
                  平台: {metrics.platform}
                </p>
              </div>
            </div>
          )}

          {/* 閾值資訊 */}
          {config && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">告警閾值：</span>
                警告 &gt; {formatBytes(config.thresholds.memory.warnMB)} |
                錯誤 &gt; {formatBytes(config.thresholds.memory.errorMB)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 設定面板 */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              VPS 監控設定
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memoryWarnMB">記憶體警告閾值 (MB)</Label>
                <Input
                  id="memoryWarnMB"
                  type="number"
                  value={editConfig.memoryWarnMB}
                  onChange={(e) =>
                    setEditConfig({ ...editConfig, memoryWarnMB: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  超過此值會觸發警告（8192 = 8GB）
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryErrorMB">記憶體錯誤閾值 (MB)</Label>
                <Input
                  id="memoryErrorMB"
                  type="number"
                  value={editConfig.memoryErrorMB}
                  onChange={(e) =>
                    setEditConfig({ ...editConfig, memoryErrorMB: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  超過此值會觸發錯誤告警並發送 Webhook（10240 = 10GB）
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryPercentWarn">記憶體使用率警告閾值 (%)</Label>
                <Input
                  id="memoryPercentWarn"
                  type="number"
                  value={editConfig.memoryPercentWarn}
                  onChange={(e) =>
                    setEditConfig({ ...editConfig, memoryPercentWarn: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryPercentError">記憶體使用率錯誤閾值 (%)</Label>
                <Input
                  id="memoryPercentError"
                  type="number"
                  value={editConfig.memoryPercentError}
                  onChange={(e) =>
                    setEditConfig({ ...editConfig, memoryPercentError: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={testWebhook}
                disabled={testing}
              >
                <Bell className={`h-4 w-4 mr-2 ${testing ? "animate-pulse" : ""}`} />
                {testing ? "發送中..." : "測試 Webhook"}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  取消
                </Button>
                <Button onClick={saveConfig} disabled={saving}>
                  {saving ? "儲存中..." : "儲存設定"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VPS 告警歷史 */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              VPS 告警記錄
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.level === "ERROR"
                      ? "border-red-500/50 bg-red-500/10"
                      : alert.level === "WARN"
                      ? "border-yellow-500/50 bg-yellow-500/10"
                      : "border-blue-500/50 bg-blue-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={alert.level === "ERROR" ? "destructive" : "outline"}
                      >
                        {alert.level}
                      </Badge>
                      <span className="text-sm font-medium">{alert.message}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.triggeredAt).toLocaleString("zh-TW")}
                    </span>
                  </div>
                  {alert.details && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {alert.details.usedGB && (
                        <span>使用量: {alert.details.usedGB} GB / {alert.details.totalGB} GB</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
