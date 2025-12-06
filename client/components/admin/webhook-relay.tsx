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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Plus,
  Trash2,
  TestTube,
  Copy,
  RefreshCw,
  ExternalLink,
  History,
  Settings,
} from "lucide-react";

interface WebhookEndpoint {
  id: number;
  endpoint_key: string;
  name: string;
  description: string | null;
  source_type: string;
  discord_webhook_url: string;
  enabled: boolean;
  guild_id: string | null;
  total_received: number;
  total_forwarded: number;
  total_failed: number;
  last_received_at: string | null;
  last_forwarded_at: string | null;
  created_at: string;
}

interface WebhookLog {
  id: number;
  endpoint_id: number;
  raw_body: object;
  status: string;
  error_message: string | null;
  received_at: string;
  forwarded_at: string | null;
}

interface SourceType {
  id: string;
  name: string;
  description: string;
}

interface WebhookRelayProps {
  guildId: string;
}

export function WebhookRelay({ guildId }: WebhookRelayProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [sourceTypes, setSourceTypes] = useState<SourceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] =
    useState<WebhookEndpoint | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // 新端點表單
  const [newEndpoint, setNewEndpoint] = useState({
    name: "",
    description: "",
    source_type: "statuspage",
    discord_webhook_url: "",
  });

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // 載入端點列表
  const loadEndpoints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/webhook/endpoints?guild_id=${guildId}`,
        {
          headers: getAuthHeaders(),
        }
      );
      const data = await response.json();
      setEndpoints(data.endpoints || []);
    } catch (error) {
      console.error("Failed to load endpoints:", error);
      toast({
        title: "載入失敗",
        description: "無法載入 Webhook 端點列表",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [guildId, getAuthHeaders, toast]);

  // 載入來源類型
  const loadSourceTypes = useCallback(async () => {
    try {
      const response = await fetch("/api/webhook/source-types");
      const data = await response.json();
      setSourceTypes(data.source_types || []);
    } catch (error) {
      console.error("Failed to load source types:", error);
    }
  }, []);

  useEffect(() => {
    loadEndpoints();
    loadSourceTypes();
  }, [loadEndpoints, loadSourceTypes]);

  // 創建端點
  const handleCreate = async () => {
    if (!newEndpoint.name || !newEndpoint.discord_webhook_url) {
      toast({
        title: "缺少必要欄位",
        description: "請填寫名稱和 Discord Webhook URL",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/webhook/endpoints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...newEndpoint,
          guild_id: guildId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 複製 URL 到剪貼簿
        if (data.receive_url) {
          navigator.clipboard.writeText(data.receive_url);
        }
        toast({
          title: "創建成功",
          description: `接收 URL 已複製到剪貼簿: ${data.receive_url}`,
        });
        setCreateDialogOpen(false);
        setNewEndpoint({
          name: "",
          description: "",
          source_type: "statuspage",
          discord_webhook_url: "",
        });
        loadEndpoints();
      } else {
        toast({
          title: "創建失敗",
          description: data.error || "未知錯誤",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to create endpoint:", error);
      toast({
        title: "創建失敗",
        description: "網路錯誤",
        variant: "destructive",
      });
    }
  };

  // 切換啟用狀態
  const handleToggleEnabled = async (endpoint: WebhookEndpoint) => {
    try {
      const response = await fetch(`/api/webhook/endpoints/${endpoint.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ enabled: !endpoint.enabled }),
      });

      if (response.ok) {
        loadEndpoints();
      }
    } catch (error) {
      console.error("Failed to toggle endpoint:", error);
    }
  };

  // 測試端點
  const handleTest = async (endpoint: WebhookEndpoint) => {
    try {
      const response = await fetch(
        `/api/webhook/endpoints/${endpoint.id}/test`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "測試成功",
          description: "測試訊息已發送到 Discord",
        });
      } else {
        toast({
          title: "測試失敗",
          description: data.error || "發送失敗",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to test endpoint:", error);
      toast({
        title: "測試失敗",
        description: "網路錯誤",
        variant: "destructive",
      });
    }
  };

  // 刪除端點
  const handleDelete = async (endpoint: WebhookEndpoint) => {
    if (!confirm(`確定要刪除「${endpoint.name}」嗎？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/webhook/endpoints/${endpoint.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast({
          title: "刪除成功",
        });
        loadEndpoints();
      }
    } catch (error) {
      console.error("Failed to delete endpoint:", error);
    }
  };

  // 複製接收 URL
  const handleCopyUrl = (endpoint: WebhookEndpoint) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/api/webhook/relay/${endpoint.endpoint_key}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "已複製",
      description: "接收 URL 已複製到剪貼簿",
    });
  };

  // 查看日誌
  const handleViewLogs = async (endpoint: WebhookEndpoint) => {
    setSelectedEndpoint(endpoint);
    setLogsDialogOpen(true);
    setLogsLoading(true);

    try {
      const response = await fetch(
        `/api/webhook/endpoints/${endpoint.id}/logs?limit=20`,
        {
          headers: getAuthHeaders(),
        }
      );
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to load logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "forwarded":
        return <Badge className="bg-green-500">已轉發</Badge>;
      case "failed":
        return <Badge variant="destructive">失敗</Badge>;
      case "received":
        return <Badge variant="secondary">已接收</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Webhook 中轉管理
            </CardTitle>
            <CardDescription>
              接收外部 Webhook 並轉發到 Discord 頻道
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadEndpoints}>
              <RefreshCw className="h-4 w-4 mr-1" />
              重新整理
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  新增端點
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新增 Webhook 端點</DialogTitle>
                  <DialogDescription>
                    創建一個新的 Webhook 接收端點，用於接收外部服務的通知
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">名稱 *</Label>
                    <Input
                      id="name"
                      placeholder="例如：Discord Status 通知"
                      value={newEndpoint.name}
                      onChange={(e) =>
                        setNewEndpoint({ ...newEndpoint, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">描述</Label>
                    <Textarea
                      id="description"
                      placeholder="選填"
                      value={newEndpoint.description}
                      onChange={(e) =>
                        setNewEndpoint({
                          ...newEndpoint,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="source_type">來源類型</Label>
                    <Select
                      value={newEndpoint.source_type}
                      onValueChange={(value) =>
                        setNewEndpoint({ ...newEndpoint, source_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} - {type.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="discord_webhook_url">
                      Discord Webhook URL *
                    </Label>
                    <Input
                      id="discord_webhook_url"
                      type="password"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={newEndpoint.discord_webhook_url}
                      onChange={(e) =>
                        setNewEndpoint({
                          ...newEndpoint,
                          discord_webhook_url: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      在 Discord 頻道設定 → 整合 → Webhook 中取得
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    取消
                  </Button>
                  <Button onClick={handleCreate}>創建</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            載入中...
          </div>
        ) : endpoints.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>尚未創建任何 Webhook 端點</p>
            <p className="text-sm mt-2">點擊「新增端點」開始設定</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名稱</TableHead>
                <TableHead>類型</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>統計</TableHead>
                <TableHead>最後接收</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((endpoint) => (
                <TableRow key={endpoint.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{endpoint.name}</div>
                      {endpoint.description && (
                        <div className="text-xs text-muted-foreground">
                          {endpoint.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{endpoint.source_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={endpoint.enabled}
                      onCheckedChange={() => handleToggleEnabled(endpoint)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div>接收: {endpoint.total_received}</div>
                      <div className="text-green-500">
                        轉發: {endpoint.total_forwarded}
                      </div>
                      {endpoint.total_failed > 0 && (
                        <div className="text-red-500">
                          失敗: {endpoint.total_failed}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {endpoint.last_received_at ? (
                      <span className="text-xs">
                        {new Date(endpoint.last_received_at).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        從未
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyUrl(endpoint)}
                        title="複製接收 URL"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTest(endpoint)}
                        title="發送測試"
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewLogs(endpoint)}
                        title="查看日誌"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(endpoint)}
                        title="刪除"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* 日誌對話框 */}
        <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Webhook 日誌 - {selectedEndpoint?.name}</DialogTitle>
              <DialogDescription>最近 20 筆接收記錄</DialogDescription>
            </DialogHeader>
            {logsLoading ? (
              <div className="text-center py-8">載入中...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                尚無日誌記錄
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>時間</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead>內容預覽</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {new Date(log.received_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status)}
                        {log.error_message && (
                          <div className="text-xs text-red-500 mt-1">
                            {log.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <pre className="text-xs bg-muted p-2 rounded max-w-md overflow-x-auto">
                          {JSON.stringify(log.raw_body, null, 2).substring(
                            0,
                            200
                          )}
                          {JSON.stringify(log.raw_body).length > 200 && "..."}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
