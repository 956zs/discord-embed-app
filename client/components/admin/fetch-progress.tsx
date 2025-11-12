"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ActiveTask {
  taskId: number;
  status: string;
  progress: {
    messagesFetched: number;
    messagesSaved: number;
    messagesDuplicate: number;
  };
}

interface FetchProgressProps {
  guildId: string;
}

export function FetchProgress({ guildId }: FetchProgressProps) {
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);

  const loadActiveTasks = async () => {
    try {
      // 使用相對路徑
      const response = await fetch(`/api/fetch/active`);
      const data = await response.json();
      setActiveTasks(data);
    } catch (error) {
      console.error("載入活躍任務失敗:", error);
    }
  };

  useEffect(() => {
    loadActiveTasks();
    const interval = setInterval(loadActiveTasks, 2000); // 每 2 秒刷新
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          活躍任務
        </CardTitle>
        <CardDescription>正在進行的歷史訊息提取任務</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeTasks.map((task) => (
            <div key={task.taskId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">任務 #{task.taskId}</span>
                <span className="text-muted-foreground">
                  {task.progress.messagesFetched.toLocaleString()} 則訊息
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">已提取</div>
                  <div className="font-medium">
                    {task.progress.messagesFetched.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">已儲存</div>
                  <div className="font-medium text-green-600">
                    {task.progress.messagesSaved.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">重複</div>
                  <div className="font-medium text-yellow-600">
                    {task.progress.messagesDuplicate.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary animate-pulse"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
