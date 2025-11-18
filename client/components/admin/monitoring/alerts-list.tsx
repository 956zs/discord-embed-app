"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface Alert {
  id: number;
  level: "ERROR" | "WARN" | "INFO";
  message: string;
  details: any;
  triggeredAt: string;
  status: "active" | "resolved";
}

interface AlertsListProps {
  alerts: Alert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<"all" | "ERROR" | "WARN" | "INFO">(
    "all"
  );

  // 過濾告警
  const filteredAlerts =
    filter === "all" ? alerts : alerts.filter((a) => a.level === filter);

  // 獲取告警圖示
  const getAlertIcon = (level: string) => {
    switch (level) {
      case "ERROR":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "WARN":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "INFO":
        return <Info className="h-4 w-4 text-blue-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  // 獲取告警徽章變體
  const getAlertBadgeVariant = (level: string) => {
    switch (level) {
      case "ERROR":
        return "destructive";
      case "WARN":
        return "secondary";
      case "INFO":
        return "default";
      default:
        return "outline";
    }
  };

  // 格式化時間
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // 格式化詳細資訊
  const formatDetails = (details: any) => {
    if (!details) return null;
    if (typeof details === "string") return details;
    return JSON.stringify(details, null, 2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t.monitoring.recentAlerts}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              {t.monitoring.all}
            </Button>
            <Button
              variant={filter === "ERROR" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setFilter("ERROR")}
            >
              ERROR
            </Button>
            <Button
              variant={filter === "WARN" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFilter("WARN")}
            >
              WARN
            </Button>
            <Button
              variant={filter === "INFO" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("INFO")}
            >
              INFO
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAlerts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {t.monitoring.noAlerts}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2 flex-1">
                    {getAlertIcon(alert.level)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getAlertBadgeVariant(alert.level)}>
                          {alert.level}
                        </Badge>
                        {alert.status === "resolved" && (
                          <Badge variant="outline">
                            {t.monitoring.resolved}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(alert.triggeredAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {alert.details && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      {t.monitoring.viewDetails}
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                      {formatDetails(alert.details)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
