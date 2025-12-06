"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, RotateCcw } from "lucide-react";

interface SlowRequestConfig {
  enabled: boolean;
  warnThreshold: number;
  errorThreshold: number;
}

interface AlertConfig {
  thresholds: {
    cpu: { warn: number; error: number };
    memory: { warn: number; error: number };
    eventLoopDelay: { warn: number; error: number };
    apiResponseTime: { warn: number; error: number };
    dbQueryTime: { warn: number; error: number };
  };
  slowRequest: SlowRequestConfig;
  cooldownPeriod: number;
}

export function AlertSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [slowRequest, setSlowRequest] = useState<SlowRequestConfig>({
    enabled: false,
    warnThreshold: 1000,
    errorThreshold: 3000,
  });

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/metrics/config", {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
        if (data.config?.slowRequest) {
          setSlowRequest(data.config.slowRequest);
        }
      } else {
        console.error("Failed to load config:", response.status);
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch("/api/metrics/config/slow-request", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(slowRequest),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "設定已儲存",
          description: "慢速請求警告設定已更新",
        });
        // 更新本地狀態
        if (data.config) {
          setSlowRequest(data.config);
        }
      } else {
        toast({
          title: "儲存失敗",
          description: data.error || "未知錯誤",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      toast({
        title: "儲存失敗",
        description: "網路錯誤",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSlowRequest({
      enabled: false,
      warnThreshold: 1000,
      errorThreshold: 3000,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            告警設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            載入中...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          告警設定
        </CardTitle>
        <CardDescription>調整監控系統的告警閾值和行為</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 慢速請求警告設定 */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">慢速請求警告</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>啟用慢速請求警告</Label>
              <p className="text-xs text-muted-foreground">
                當 API 請求時間超過閾值時觸發警告
              </p>
            </div>
            <Switch
              checked={slowRequest.enabled}
              onCheckedChange={(checked) =>
                setSlowRequest({ ...slowRequest, enabled: checked })
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="warnThreshold">警告閾值 (ms)</Label>
              <Input
                id="warnThreshold"
                type="number"
                min={100}
                step={100}
                value={slowRequest.warnThreshold}
                onChange={(e) =>
                  setSlowRequest({
                    ...slowRequest,
                    warnThreshold: parseInt(e.target.value) || 1000,
                  })
                }
                disabled={!slowRequest.enabled}
              />
              <p className="text-xs text-muted-foreground">
                超過此時間會觸發 WARN 級別告警
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="errorThreshold">錯誤閾值 (ms)</Label>
              <Input
                id="errorThreshold"
                type="number"
                min={100}
                step={100}
                value={slowRequest.errorThreshold}
                onChange={(e) =>
                  setSlowRequest({
                    ...slowRequest,
                    errorThreshold: parseInt(e.target.value) || 3000,
                  })
                }
                disabled={!slowRequest.enabled}
              />
              <p className="text-xs text-muted-foreground">
                超過此時間會觸發 ERROR 級別告警
              </p>
            </div>
          </div>
        </div>

        {/* 其他閾值顯示（唯讀） */}
        {config && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium">系統閾值（環境變數設定）</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU 警告 / 錯誤</span>
                <span>
                  {config.thresholds.cpu.warn}% / {config.thresholds.cpu.error}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  記憶體 警告 / 錯誤
                </span>
                <span>
                  {config.thresholds.memory.warn}% /{" "}
                  {config.thresholds.memory.error}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  API 響應時間 警告 / 錯誤
                </span>
                <span>
                  {config.thresholds.apiResponseTime.warn}ms /{" "}
                  {config.thresholds.apiResponseTime.error}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  資料庫查詢 警告 / 錯誤
                </span>
                <span>
                  {config.thresholds.dbQueryTime.warn}ms /{" "}
                  {config.thresholds.dbQueryTime.error}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">告警冷卻期</span>
                <span>{Math.round(config.cooldownPeriod / 60000)} 分鐘</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              這些設定需要透過環境變數調整，修改後需重啟服務
            </p>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "儲存中..." : "儲存設定"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            重設為預設值
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
