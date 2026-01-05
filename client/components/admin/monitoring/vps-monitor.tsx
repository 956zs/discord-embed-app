"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Network,
  Activity,
  MemoryStick,
} from "lucide-react";

interface SwapInfo {
  totalMB: number;
  usedMB: number;
  freeMB: number;
  usedPercent: number;
}

interface DiskInfo {
  totalGB: number;
  usedGB: number;
  availableGB: number;
  usedPercent: number;
  inodes?: { total: number; free: number; usedPercent: number };
}

interface DiskIOInfo {
  readMBps: number;
  writeMBps: number;
  readIOPS: number;
  writeIOPS: number;
  ioPercent: number;
}

interface NetworkInfo {
  rxMBps: number;
  txMBps: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  rxDrops: number;
  txDrops: number;
  rxTotalGB: number;
  txTotalGB: number;
}

interface ConnectionsInfo {
  tcpEstablished: number;
  tcpRetransPerSec: number;
}

interface VpsMetrics {
  memory: {
    totalMB: number;
    usedMB: number;
    freeMB: number;
    availableMB: number;
    buffersCacheMB: number;
    usedPercent: number;
    activeMB?: number;
    inactiveMB?: number;
    swap?: SwapInfo;
  };
  cpu: {
    count: number;
    usage: number;
    user?: number;
    system?: number;
    iowait?: number;
    steal?: number;
    idle?: number;
    perCore?: number[];
  };
  load: {
    avg1: number;
    avg5: number;
    avg15: number;
  };
  disk?: DiskInfo;
  diskIO?: DiskIOInfo;
  network?: NetworkInfo;
  connections?: ConnectionsInfo;
  uptime: number;
  platform: string;
  hostname: string;
  vendor?: string;
  source?: string;
  timestamp: number;
}

interface VpsConfig {
  interval: number;
  thresholds: {
    memoryAvailable: { warnMB: number; errorMB: number };
    memoryPercent: { warn: number; error: number };
  };
  cooldownPeriod: number;
  memoryAvailableWarnMB: number;
  memoryAvailableErrorMB: number;
}

interface VpsAlert {
  id: number;
  level: "ERROR" | "WARN" | "INFO";
  message: string;
  details: any;
  triggeredAt: string;
  source: string;
}

export function VpsMonitor() {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState<VpsMetrics | null>(null);
  const [config, setConfig] = useState<VpsConfig | null>(null);
  const [alerts, setAlerts] = useState<VpsAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [editConfig, setEditConfig] = useState({
    memoryAvailableWarnMB: 4096,
    memoryAvailableErrorMB: 2048,
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
          memoryAvailableWarnMB: data.config.memoryAvailableWarnMB || data.config.thresholds.memoryAvailable.warnMB,
          memoryAvailableErrorMB: data.config.memoryAvailableErrorMB || data.config.thresholds.memoryAvailable.errorMB,
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
      }
    } catch (err) {
      console.error("儲存設定失敗:", err);
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    setTesting(true);
    try {
      await fetch("/api/metrics/vps/webhook/test", { method: "POST" });
    } catch (err) {
      console.error("測試 Webhook 失敗:", err);
    } finally {
      setTesting(false);
    }
  };

  const formatBytes = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb} MB`);
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days} 天 ${hours} 小時`;
    if (hours > 0) return `${hours} 小時 ${minutes} 分鐘`;
    return `${minutes} 分鐘`;
  };

  const getMemoryStatus = (availableMB: number, config: VpsConfig | null) => {
    if (!config) return "normal";
    if (availableMB <= config.thresholds.memoryAvailable.errorMB) return "error";
    if (availableMB <= config.thresholds.memoryAvailable.warnMB) return "warn";
    return "normal";
  };

  const getStatusColor = (percent: number, warn = 70, error = 90) => {
    if (percent >= error) return "bg-red-500";
    if (percent >= warn) return "bg-yellow-500";
    return "bg-green-500";
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

  const memoryStatus = metrics ? getMemoryStatus(metrics.memory.availableMB, config) : "normal";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              VPS 主機監控
              {metrics && (
                <>
                  <Badge variant="outline" className="ml-2">{metrics.hostname}</Badge>
                  {metrics.source === "prometheus" && (
                    <Badge variant="secondary" className="ml-1">Prometheus</Badge>
                  )}
                </>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="h-4 w-4 mr-1" />
                設定
              </Button>
              <Button variant="outline" size="sm" onClick={fetchVpsData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {metrics && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview"><Activity className="h-4 w-4 mr-1" />總覽</TabsTrigger>
                <TabsTrigger value="cpu"><Cpu className="h-4 w-4 mr-1" />CPU</TabsTrigger>
                <TabsTrigger value="memory"><MemoryStick className="h-4 w-4 mr-1" />記憶體</TabsTrigger>
                <TabsTrigger value="disk"><HardDrive className="h-4 w-4 mr-1" />硬碟</TabsTrigger>
                <TabsTrigger value="network"><Network className="h-4 w-4 mr-1" />網路</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <MetricCard
                    title="可用記憶體"
                    value={formatBytes(metrics.memory.availableMB)}
                    subtitle={`總共 ${formatBytes(metrics.memory.totalMB)} | 使用率 ${metrics.memory.usedPercent}%`}
                    status={memoryStatus}
                    progress={100 - metrics.memory.usedPercent}
                  />
                  <MetricCard
                    title="CPU 使用率"
                    value={`${metrics.cpu.usage}%`}
                    subtitle={`${metrics.cpu.count} 核心`}
                    progress={metrics.cpu.usage}
                    progressColor={getStatusColor(metrics.cpu.usage)}
                  />
                  <MetricCard
                    title="系統負載"
                    value={`${metrics.load.avg1}`}
                    subtitle={`5m: ${metrics.load.avg5} | 15m: ${metrics.load.avg15}`}
                  />
                  <MetricCard
                    title="系統運行時間"
                    value={formatUptime(metrics.uptime)}
                    subtitle={`平台: ${metrics.platform}`}
                  />
                </div>
                {metrics.disk && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <MetricCard
                      title="硬碟使用"
                      value={`${metrics.disk.usedGB.toFixed(1)} / ${metrics.disk.totalGB.toFixed(1)} GB`}
                      subtitle={`可用 ${metrics.disk.availableGB.toFixed(1)} GB`}
                      progress={metrics.disk.usedPercent}
                      progressColor={getStatusColor(metrics.disk.usedPercent, 80, 95)}
                    />
                    {metrics.connections && (
                      <MetricCard
                        title="TCP 連線"
                        value={`${metrics.connections.tcpEstablished}`}
                        subtitle={`重傳率: ${metrics.connections.tcpRetransPerSec.toFixed(2)}/s`}
                      />
                    )}
                  </div>
                )}
              </TabsContent>

              {/* CPU Tab */}
              <TabsContent value="cpu">
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard title="總體使用率" value={`${metrics.cpu.usage}%`} progress={metrics.cpu.usage} progressColor={getStatusColor(metrics.cpu.usage)} />
                    {metrics.cpu.user !== undefined && <MetricCard title="User" value={`${metrics.cpu.user.toFixed(1)}%`} progress={metrics.cpu.user} progressColor="bg-blue-500" />}
                    {metrics.cpu.system !== undefined && <MetricCard title="System" value={`${metrics.cpu.system.toFixed(1)}%`} progress={metrics.cpu.system} progressColor="bg-purple-500" />}
                  </div>
                  {metrics.cpu.iowait !== undefined && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <MetricCard title="I/O Wait" value={`${metrics.cpu.iowait.toFixed(1)}%`} progress={metrics.cpu.iowait} progressColor="bg-orange-500" />
                      {metrics.cpu.steal !== undefined && <MetricCard title="Steal" value={`${metrics.cpu.steal.toFixed(1)}%`} progress={metrics.cpu.steal} progressColor="bg-red-500" />}
                      {metrics.cpu.idle !== undefined && <MetricCard title="Idle" value={`${metrics.cpu.idle.toFixed(1)}%`} progress={metrics.cpu.idle} progressColor="bg-gray-400" />}
                    </div>
                  )}
                  {metrics.cpu.perCore && metrics.cpu.perCore.length > 0 && (
                    <Card>
                      <CardHeader className="py-3"><CardTitle className="text-sm">每核心使用率</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                          {metrics.cpu.perCore.map((usage, i) => (
                            <div key={i} className="text-center">
                              <div className="text-xs text-muted-foreground mb-1">Core {i}</div>
                              <Progress value={usage} className="h-2" />
                              <div className="text-xs mt-1">{usage.toFixed(0)}%</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Memory Tab */}
              <TabsContent value="memory">
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard title="已使用" value={formatBytes(metrics.memory.usedMB)} subtitle={`${metrics.memory.usedPercent}%`} progress={metrics.memory.usedPercent} progressColor={getStatusColor(metrics.memory.usedPercent, 80, 90)} />
                    <MetricCard title="可用" value={formatBytes(metrics.memory.availableMB)} status={memoryStatus} />
                    <MetricCard title="緩存" value={formatBytes(metrics.memory.buffersCacheMB)} />
                  </div>
                  {metrics.memory.activeMB !== undefined && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <MetricCard title="Active" value={formatBytes(metrics.memory.activeMB)} />
                      <MetricCard title="Inactive" value={formatBytes(metrics.memory.inactiveMB || 0)} />
                    </div>
                  )}
                  {metrics.memory.swap && metrics.memory.swap.totalMB > 0 && (
                    <Card>
                      <CardHeader className="py-3"><CardTitle className="text-sm">Swap</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <MetricCard title="總計" value={formatBytes(metrics.memory.swap.totalMB)} />
                          <MetricCard title="已使用" value={formatBytes(metrics.memory.swap.usedMB)} subtitle={`${metrics.memory.swap.usedPercent}%`} progress={metrics.memory.swap.usedPercent} progressColor={getStatusColor(metrics.memory.swap.usedPercent, 50, 80)} />
                          <MetricCard title="可用" value={formatBytes(metrics.memory.swap.freeMB)} />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Disk Tab */}
              <TabsContent value="disk">
                <div className="space-y-4 mt-4">
                  {metrics.disk ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <MetricCard title="總計" value={`${metrics.disk.totalGB.toFixed(1)} GB`} />
                        <MetricCard title="已使用" value={`${metrics.disk.usedGB.toFixed(1)} GB`} subtitle={`${metrics.disk.usedPercent}%`} progress={metrics.disk.usedPercent} progressColor={getStatusColor(metrics.disk.usedPercent, 80, 95)} />
                        <MetricCard title="可用" value={`${metrics.disk.availableGB.toFixed(1)} GB`} />
                      </div>
                      {metrics.disk.inodes && (
                        <Card>
                          <CardHeader className="py-3"><CardTitle className="text-sm">Inodes</CardTitle></CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <MetricCard title="總計" value={metrics.disk.inodes.total.toLocaleString()} />
                              <MetricCard title="可用" value={metrics.disk.inodes.free.toLocaleString()} />
                              <MetricCard title="使用率" value={`${metrics.disk.inodes.usedPercent}%`} progress={metrics.disk.inodes.usedPercent} progressColor={getStatusColor(metrics.disk.inodes.usedPercent, 80, 95)} />
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {metrics.diskIO && (
                        <Card>
                          <CardHeader className="py-3"><CardTitle className="text-sm">硬碟 I/O</CardTitle></CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <MetricCard title="讀取" value={`${metrics.diskIO.readMBps.toFixed(2)} MB/s`} />
                              <MetricCard title="寫入" value={`${metrics.diskIO.writeMBps.toFixed(2)} MB/s`} />
                              <MetricCard title="讀取 IOPS" value={metrics.diskIO.readIOPS.toFixed(0)} />
                              <MetricCard title="寫入 IOPS" value={metrics.diskIO.writeIOPS.toFixed(0)} />
                              <MetricCard title="I/O 使用率" value={`${metrics.diskIO.ioPercent.toFixed(1)}%`} progress={metrics.diskIO.ioPercent} progressColor={getStatusColor(metrics.diskIO.ioPercent, 70, 90)} />
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">硬碟資訊需要 Prometheus 數據源</div>
                  )}
                </div>
              </TabsContent>

              {/* Network Tab */}
              <TabsContent value="network">
                <div className="space-y-4 mt-4">
                  {metrics.network ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard title="下載" value={`${metrics.network.rxMBps.toFixed(2)} MB/s`} />
                        <MetricCard title="上傳" value={`${metrics.network.txMBps.toFixed(2)} MB/s`} />
                        <MetricCard title="累計下載" value={`${metrics.network.rxTotalGB.toFixed(2)} GB`} />
                        <MetricCard title="累計上傳" value={`${metrics.network.txTotalGB.toFixed(2)} GB`} />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard title="接收封包" value={`${metrics.network.rxPackets.toFixed(0)}/s`} />
                        <MetricCard title="發送封包" value={`${metrics.network.txPackets.toFixed(0)}/s`} />
                        <MetricCard title="接收錯誤" value={`${metrics.network.rxErrors.toFixed(0)}/s`} />
                        <MetricCard title="發送錯誤" value={`${metrics.network.txErrors.toFixed(0)}/s`} />
                      </div>
                      {(metrics.network.rxDrops > 0 || metrics.network.txDrops > 0) && (
                        <div className="grid grid-cols-2 gap-4">
                          <MetricCard title="接收丟棄" value={`${metrics.network.rxDrops.toFixed(0)}/s`} />
                          <MetricCard title="發送丟棄" value={`${metrics.network.txDrops.toFixed(0)}/s`} />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">網路資訊需要 Prometheus 數據源</div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {config && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">告警閾值（可用記憶體低於）：</span>
                警告 &lt; {formatBytes(config.thresholds.memoryAvailable.warnMB)} |
                錯誤 &lt; {formatBytes(config.thresholds.memoryAvailable.errorMB)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Panel */}
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
                <Label htmlFor="memoryAvailableWarnMB">可用記憶體警告閾值 (MB)</Label>
                <Input
                  id="memoryAvailableWarnMB"
                  type="number"
                  value={editConfig.memoryAvailableWarnMB}
                  onChange={(e) => setEditConfig({ ...editConfig, memoryAvailableWarnMB: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">可用記憶體低於此值會觸發警告（4096 = 4GB）</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryAvailableErrorMB">可用記憶體錯誤閾值 (MB)</Label>
                <Input
                  id="memoryAvailableErrorMB"
                  type="number"
                  value={editConfig.memoryAvailableErrorMB}
                  onChange={(e) => setEditConfig({ ...editConfig, memoryAvailableErrorMB: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">可用記憶體低於此值會觸發錯誤告警並發送 Webhook</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryPercentWarn">記憶體使用率警告閾值 (%)</Label>
                <Input
                  id="memoryPercentWarn"
                  type="number"
                  value={editConfig.memoryPercentWarn}
                  onChange={(e) => setEditConfig({ ...editConfig, memoryPercentWarn: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memoryPercentError">記憶體使用率錯誤閾值 (%)</Label>
                <Input
                  id="memoryPercentError"
                  type="number"
                  value={editConfig.memoryPercentError}
                  onChange={(e) => setEditConfig({ ...editConfig, memoryPercentError: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={testWebhook} disabled={testing}>
                <Bell className={`h-4 w-4 mr-2 ${testing ? "animate-pulse" : ""}`} />
                {testing ? "發送中..." : "測試 Webhook"}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSettings(false)}>取消</Button>
                <Button onClick={saveConfig} disabled={saving}>{saving ? "儲存中..." : "儲存設定"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts History */}
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
                      <Badge variant={alert.level === "ERROR" ? "destructive" : "outline"}>{alert.level}</Badge>
                      <span className="text-sm font-medium">{alert.message}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.triggeredAt).toLocaleString("zh-TW")}
                    </span>
                  </div>
                  {alert.details?.availableGB && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      可用記憶體: {alert.details.availableGB} GB / 總共: {alert.details.totalGB} GB
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

function MetricCard({
  title,
  value,
  subtitle,
  status,
  progress,
  progressColor,
}: {
  title: string;
  value: string;
  subtitle?: string;
  status?: "normal" | "warn" | "error";
  progress?: number;
  progressColor?: string;
}) {
  const borderClass = status === "error" ? "border-red-500 bg-red-500/10" : status === "warn" ? "border-yellow-500 bg-yellow-500/10" : "border-border";

  return (
    <div className={`p-4 rounded-lg border ${borderClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        {status === "error" && <AlertTriangle className="h-4 w-4 text-red-500" />}
        {status === "warn" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
        {status === "normal" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      {progress !== undefined && (
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div className={`h-2 rounded-full ${progressColor || "bg-green-500"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  );
}
