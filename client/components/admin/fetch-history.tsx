"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { HistoryTask } from "@/types";

interface FetchHistoryProps {
  guildId: string;
}

export function FetchHistory({ guildId }: FetchHistoryProps) {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<HistoryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const loadTasks = async () => {
    try {
      // 使用相對路徑
      const url =
        filter === "all"
          ? `/api/history/${guildId}/tasks`
          : `/api/history/${guildId}/tasks?status=${filter}`;

      const response = await fetch(url);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("載入任務失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000); // 每 5 秒刷新
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId, filter]);

  const getStatusBadge = (status: HistoryTask["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t.admin.completed}
          </Badge>
        );
      case "running":
        return (
          <Badge variant="default" className="bg-blue-500">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {t.admin.running}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t.admin.failed}
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="default" className="bg-yellow-500">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {t.admin.warning}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t.admin.pending}
          </Badge>
        );
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("zh-TW");
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return "-";
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {t.common.loading}...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.admin.fetchHistory}</CardTitle>
        <CardDescription>{t.admin.viewAllTasks}</CardDescription>

        {/* 篩選器 */}
        <div className="flex gap-2 mt-4">
          {["all", "running", "completed", "failed", "warning"].map((f) => (
            <Badge
              key={f}
              variant={filter === f ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? t.admin.all
                : f === "running"
                ? t.admin.running
                : f === "completed"
                ? t.admin.completed
                : f === "failed"
                ? t.admin.failed
                : t.admin.warning}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t.admin.noTasks}
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="p-4 rounded-lg border space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">#{task.channel_name}</span>
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {t.admin.taskId}: {task.id}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-muted-foreground">
                      {formatDate(task.created_at)}
                    </div>
                    {task.started_at && task.completed_at && (
                      <div className="text-xs text-muted-foreground">
                        {t.admin.duration}:{" "}
                        {formatDuration(task.started_at, task.completed_at)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">
                      {t.admin.fetched}
                    </div>
                    <div className="font-medium">
                      {task.messages_fetched?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t.admin.saved}</div>
                    <div className="font-medium text-green-600">
                      {task.messages_saved?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t.admin.duplicate}
                    </div>
                    <div className="font-medium text-yellow-600">
                      {task.messages_duplicate?.toLocaleString()}
                    </div>
                  </div>
                </div>

                {task.error_message && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {t.admin.error}: {task.error_message}
                  </div>
                )}

                {task.start_message_id && task.end_message_id && (
                  <div className="text-xs text-muted-foreground">
                    {t.admin.messageRange}: {task.start_message_id} ~{" "}
                    {task.end_message_id}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
