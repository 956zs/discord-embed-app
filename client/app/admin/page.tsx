"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChannelTree } from "@/components/admin/channel-tree";
import { FetchHistory } from "@/components/admin/fetch-history";
import { FetchProgress } from "@/components/admin/fetch-progress";
import type { FetchSummary } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3008";

export default function AdminPage() {
  const [guildId, setGuildId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FetchSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"channels" | "history">(
    "channels"
  );

  useEffect(() => {
    // 從 Discord Embedded App SDK 獲取 guild_id 和 user_id
    const params = new URLSearchParams(window.location.search);
    const gid =
      params.get("guild_id") || process.env.NEXT_PUBLIC_DEV_GUILD_ID || "";
    const uid = params.get("user_id") || ""; // Discord SDK 會提供

    setGuildId(gid);
    setUserId(uid);

    if (gid && uid) {
      checkAdminStatus(gid, uid);
      loadSummary(gid);
    }
  }, []);

  const checkAdminStatus = async (gid: string, uid: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/history/${gid}/admins/${uid}/check`
      );
      const data = await response.json();
      setIsAdmin(data.isAdmin);
    } catch (error) {
      console.error("檢查管理員狀態失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (gid: string) => {
    try {
      const response = await fetch(`${API_URL}/api/history/${gid}/summary`);
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("載入摘要失敗:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>權限不足</CardTitle>
            <CardDescription>您需要管理員權限才能訪問此頁面</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              請聯繫伺服器管理員以獲取訪問權限。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">管理員控制台</h1>
          <p className="text-muted-foreground">歷史訊息提取與管理</p>
        </div>
      </div>

      {/* 摘要卡片 */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>總任務數</CardDescription>
              <CardTitle className="text-3xl">{summary.total_tasks}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                運行中: {summary.running_tasks} | 待處理:{" "}
                {summary.pending_tasks}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>已提取訊息</CardDescription>
              <CardTitle className="text-3xl">
                {summary.total_messages_saved?.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                重複: {summary.total_messages_duplicate?.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>完成率</CardDescription>
              <CardTitle className="text-3xl">
                {summary.total_tasks > 0
                  ? Math.round(
                      (summary.completed_tasks / summary.total_tasks) * 100
                    )
                  : 0}
                %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                成功: {summary.completed_tasks} | 失敗: {summary.failed_tasks}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>已處理頻道</CardDescription>
              <CardTitle className="text-3xl">
                {summary.channels_processed}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                警告: {summary.warning_tasks}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 活躍任務進度 */}
      <FetchProgress guildId={guildId} />

      {/* 標籤切換 */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "channels" ? "default" : "ghost"}
          onClick={() => setActiveTab("channels")}
        >
          頻道樹狀圖
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "ghost"}
          onClick={() => setActiveTab("history")}
        >
          提取歷史
        </Button>
      </div>

      {/* 內容區域 */}
      {activeTab === "channels" && (
        <ChannelTree guildId={guildId} userId={userId} />
      )}

      {activeTab === "history" && <FetchHistory guildId={guildId} />}
    </div>
  );
}
