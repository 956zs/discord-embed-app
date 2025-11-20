"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MetricsChartsProps {
  metrics: {
    current: any;
    historical: any[];
    summary: any;
  } | null;
  timePeriod: "1h" | "6h" | "24h";
  onTimePeriodChange: (period: "1h" | "6h" | "24h") => void;
}

export function MetricsCharts({
  metrics,
  timePeriod,
  onTimePeriodChange,
}: MetricsChartsProps) {
  const { t } = useLanguage();

  // 檢查數據是否存在
  const hasData =
    metrics &&
    metrics.historical &&
    ((Array.isArray(metrics.historical) && metrics.historical.length > 0) ||
      ((metrics.historical as any).system &&
        (metrics.historical as any).system.length > 0));

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.monitoring.performanceMetrics}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t.monitoring.noData}</p>
        </CardContent>
      </Card>
    );
  }

  // 格式化時間戳
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 準備圖表數據 - 合併 system, application, database 數據
  const historicalData = metrics.historical as any;
  const systemData = Array.isArray(historicalData)
    ? historicalData
    : historicalData.system || [];
  const applicationData = Array.isArray(historicalData)
    ? historicalData
    : historicalData.application || [];
  const databaseData = Array.isArray(historicalData)
    ? historicalData
    : historicalData.database || [];

  // 按時間戳合併數據
  const dataByTimestamp = new Map();

  systemData.forEach((item: any) => {
    dataByTimestamp.set(item.timestamp, {
      timestamp: item.timestamp,
      time: formatTimestamp(item.timestamp),
      cpu: item.cpu || 0,
      memory: item.memory?.system?.percentage || 0,
      eventLoopDelay: item.eventLoopDelay || 0,
    });
  });

  applicationData.forEach((item: any) => {
    const existing = dataByTimestamp.get(item.timestamp) || {
      timestamp: item.timestamp,
      time: formatTimestamp(item.timestamp),
    };
    dataByTimestamp.set(item.timestamp, {
      ...existing,
      apiRequests: item.apiRequests?.perMinute || 0,
    });
  });

  // 轉換為數組並排序
  const chartData = Array.from(dataByTimestamp.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return (
    <div className="space-y-6">
      {/* 時間範圍選擇器 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t.monitoring.timePeriod}:
        </span>
        <div className="flex gap-2">
          <Button
            variant={timePeriod === "1h" ? "default" : "outline"}
            size="sm"
            onClick={() => onTimePeriodChange("1h")}
          >
            1{t.monitoring.hour}
          </Button>
          <Button
            variant={timePeriod === "6h" ? "default" : "outline"}
            size="sm"
            onClick={() => onTimePeriodChange("6h")}
          >
            6{t.monitoring.hours}
          </Button>
          <Button
            variant={timePeriod === "24h" ? "default" : "outline"}
            size="sm"
            onClick={() => onTimePeriodChange("24h")}
          >
            24{t.monitoring.hours}
          </Button>
        </div>
      </div>

      {/* CPU 使用率圖表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.monitoring.cpuUsage}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{
                  value: "%",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name={t.monitoring.cpuUsage}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 記憶體使用量圖表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.monitoring.memoryUsage}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{
                  value: "%",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="memory"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name={t.monitoring.memoryUsage}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* API 請求數圖表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.monitoring.apiRequests}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{
                  value: t.monitoring.requestsPerMinute,
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="apiRequests"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name={t.monitoring.apiRequests}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 事件循環延遲圖表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t.monitoring.eventLoopDelay}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{
                  value: "ms",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="eventLoopDelay"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name={t.monitoring.eventLoopDelay}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
