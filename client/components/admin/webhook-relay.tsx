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
  Code,
  Info,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EmbedBuilder,
  embedDataToConfig,
  configToEmbedData,
} from "@/components/admin/embed-builder";

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

interface EmbedConfig {
  username?: string;
  avatar_url?: string;
  content?: string;
  embed?: {
    title?: string;
    titleUrl?: string;
    description?: string;
    color?: string | number;
    colorMap?: Record<string, string>;
    thumbnail?: string;
    image?: string;
    author?: {
      name?: string;
      url?: string;
      icon_url?: string;
    };
    footer?:
      | string
      | {
          text?: string;
          icon_url?: string;
        };
    timestamp?: string | boolean;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
      condition?: string;
    }>;
    fieldsFromArray?: {
      source: string;
      name: string;
      value: string;
      inline?: boolean;
      limit?: number;
    };
  };
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
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] =
    useState<WebhookEndpoint | null>(null);
  const [embedConfigJson, setEmbedConfigJson] = useState("");
  const [configError, setConfigError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<"visual" | "json">("visual");
  const [visualEmbedData, setVisualEmbedData] = useState<any>({
    fields: [],
  });

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
    } finally {
      setLoading(false);
    }
  }, [guildId, getAuthHeaders]);

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

  // 初始載入（只執行一次）
  useEffect(() => {
    loadEndpoints();
    loadSourceTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

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

  // 刪除端點（點兩次確認刪除，因為 Discord App 不支援 confirm 彈窗）
  const handleDelete = async (endpoint: WebhookEndpoint) => {
    // 第一次點擊：設定待刪除狀態
    if (pendingDeleteId !== endpoint.id) {
      setPendingDeleteId(endpoint.id);
      toast({
        title: "再次點擊確認刪除",
        description: `點擊刪除按鈕確認刪除「${endpoint.name}」`,
      });
      // 3 秒後自動取消待刪除狀態
      setTimeout(() => {
        setPendingDeleteId((current) =>
          current === endpoint.id ? null : current
        );
      }, 3000);
      return;
    }

    // 第二次點擊：執行刪除
    setPendingDeleteId(null);
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

  // 顯示接收 URL（Discord App 不支援 clipboard API）
  const handleCopyUrl = (endpoint: WebhookEndpoint) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/api/webhook/relay/${endpoint.endpoint_key}`;
    setCurrentUrl(url);
    setUrlDialogOpen(true);
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

  // 開啟自訂格式設定
  const handleOpenConfig = async (endpoint: WebhookEndpoint) => {
    setEditingEndpoint(endpoint);
    setConfigError("");
    setEditorMode("visual");

    // 載入現有設定
    try {
      const response = await fetch(`/api/webhook/endpoints/${endpoint.id}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      const config = data.endpoint?.transformer_config?.embedConfig;

      if (config) {
        setEmbedConfigJson(JSON.stringify(config, null, 2));
        setVisualEmbedData(configToEmbedData(config));
      } else {
        // 提供預設範本
        const defaultConfig = getDefaultEmbedConfig(endpoint.source_type);
        setEmbedConfigJson(JSON.stringify(defaultConfig, null, 2));
        setVisualEmbedData(configToEmbedData(defaultConfig));
      }
    } catch (error) {
      console.error("Failed to load config:", error);
      const defaultConfig = getDefaultEmbedConfig(endpoint.source_type);
      setEmbedConfigJson(JSON.stringify(defaultConfig, null, 2));
      setVisualEmbedData(configToEmbedData(defaultConfig));
    }

    setConfigDialogOpen(true);
  };

  // 同步視覺編輯器和 JSON
  const syncVisualToJson = (data: any) => {
    setVisualEmbedData(data);
    const config = embedDataToConfig(data);
    setEmbedConfigJson(JSON.stringify(config, null, 2));
  };

  const syncJsonToVisual = (json: string) => {
    setEmbedConfigJson(json);
    try {
      const config = JSON.parse(json);
      setVisualEmbedData(configToEmbedData(config));
      setConfigError("");
    } catch (e) {
      // JSON 無效時不更新視覺編輯器
    }
  };

  // 取得預設範本
  const getDefaultEmbedConfig = (sourceType: string): EmbedConfig => {
    const templates: Record<string, EmbedConfig> = {
      custom: {
        username: "{{source.name | default: 'Webhook'}}",
        embed: {
          title: "{{event.title | default: '通知'}}",
          titleUrl: "{{event.url}}",
          description: "{{event.description | truncate: 2000}}",
          color: "{{status}}",
          colorMap: {
            success: "#00FF00",
            warning: "#FFAA00",
            error: "#FF0000",
            info: "#3498DB",
          },
          author: {
            name: "{{user.name}}",
            icon_url: "{{user.avatar}}",
          },
          footer: {
            text: "{{source.name}}",
          },
          timestamp: "auto",
          fields: [
            {
              name: "狀態",
              value: "{{status | emoji}} {{status}}",
              inline: true,
            },
            {
              name: "詳情",
              value: "{{details}}",
              inline: false,
              condition: "{{details}}",
            },
          ],
        },
      },
      raw: {
        username: "Webhook Relay",
        embed: {
          title: "📥 收到 Webhook",
          description: "{{. | json | truncate: 3000 | codeblock: json}}",
          color: "#3498DB",
          timestamp: "auto",
        },
      },
    };

    return templates[sourceType] || templates.custom;
  };

  // 儲存自訂格式設定
  const handleSaveConfig = async () => {
    if (!editingEndpoint) return;

    try {
      // 驗證 JSON
      const embedConfig = JSON.parse(embedConfigJson);
      setConfigError("");

      const response = await fetch(
        `/api/webhook/endpoints/${editingEndpoint.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            transformer_config: { embedConfig },
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "設定已儲存",
          description: "自訂格式設定已更新",
        });
        setConfigDialogOpen(false);
        loadEndpoints();
      } else {
        const data = await response.json();
        toast({
          title: "儲存失敗",
          description: data.error || "未知錯誤",
          variant: "destructive",
        });
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        setConfigError("JSON 格式錯誤：" + error.message);
      } else {
        console.error("Failed to save config:", error);
        toast({
          title: "儲存失敗",
          description: "網路錯誤",
          variant: "destructive",
        });
      }
    }
  };

  // 清除自訂格式（使用預設）
  const handleClearConfig = async () => {
    if (!editingEndpoint) return;

    try {
      const response = await fetch(
        `/api/webhook/endpoints/${editingEndpoint.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            transformer_config: {},
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "已清除",
          description: "將使用預設格式",
        });
        setConfigDialogOpen(false);
        loadEndpoints();
      }
    } catch (error) {
      console.error("Failed to clear config:", error);
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
                        onClick={() => handleOpenConfig(endpoint)}
                        title="自訂格式"
                      >
                        <Code className="h-4 w-4" />
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
                        variant={
                          pendingDeleteId === endpoint.id
                            ? "destructive"
                            : "ghost"
                        }
                        size="icon"
                        onClick={() => handleDelete(endpoint)}
                        title={
                          pendingDeleteId === endpoint.id
                            ? "再次點擊確認刪除"
                            : "刪除"
                        }
                        className={
                          pendingDeleteId === endpoint.id ? "animate-pulse" : ""
                        }
                      >
                        <Trash2
                          className={`h-4 w-4 ${
                            pendingDeleteId === endpoint.id
                              ? "text-white"
                              : "text-red-500"
                          }`}
                        />
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

        {/* URL 顯示對話框 */}
        <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>接收 URL</DialogTitle>
              <DialogDescription>
                請手動選取並複製以下 URL，設定到外部服務的 Webhook 設定中
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={currentUrl}
                readOnly
                className="font-mono text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <p className="text-xs text-muted-foreground">
                點擊上方輸入框可全選 URL，然後使用 Ctrl+C (或 Cmd+C) 複製
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* 自訂格式設定對話框 */}
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>自訂訊息格式 - {editingEndpoint?.name}</DialogTitle>
              <DialogDescription>
                設定 Discord Webhook 訊息的格式，支援變數替換
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={editorMode}
              onValueChange={(v: string) =>
                setEditorMode(v as "visual" | "json")
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="visual">視覺化編輯器</TabsTrigger>
                <TabsTrigger value="json">JSON 編輯器</TabsTrigger>
              </TabsList>

              <TabsContent value="visual" className="mt-4">
                <EmbedBuilder
                  value={visualEmbedData}
                  onChange={syncVisualToJson}
                  showVariableHints={true}
                />
              </TabsContent>

              <TabsContent value="json" className="mt-4">
                <div className="space-y-4">
                  {/* 說明文件 */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="help">
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          使用說明
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="text-xs space-y-3 bg-muted p-3 rounded">
                          <div>
                            <strong>變數語法：</strong>
                            <code className="bg-background px-1 rounded">{`{{path.to.value}}`}</code>
                          </div>

                          <div>
                            <strong>管道操作：</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              <li>
                                <code>default: &quot;預設值&quot;</code> -
                                設定預設值
                              </li>
                              <li>
                                <code>truncate: 100</code> - 截斷文字
                              </li>
                              <li>
                                <code>uppercase / lowercase</code> - 大小寫轉換
                              </li>
                              <li>
                                <code>date: &quot;YYYY-MM-DD&quot;</code> -
                                日期格式化
                              </li>
                              <li>
                                <code>timestamp: R</code> - Discord 時間戳
                                (R=相對, F=完整)
                              </li>
                              <li>
                                <code>emoji</code> - 狀態轉 emoji (success→✅)
                              </li>
                              <li>
                                <code>codeblock: json</code> - 程式碼區塊
                              </li>
                              <li>
                                <code>inline</code> - 行內程式碼
                              </li>
                              <li>
                                <code>link: &quot;顯示文字&quot;</code> -
                                建立連結
                              </li>
                              <li>
                                <code>join: &quot;, &quot;</code> - 陣列合併
                              </li>
                              <li>
                                <code>first / last / count</code> - 陣列操作
                              </li>
                            </ul>
                          </div>

                          <div>
                            <strong>範例：</strong>
                            <pre className="bg-background p-2 rounded mt-1 overflow-x-auto">
                              {`{{event.name | default: "未命名"}}
{{created_at | timestamp: R}}
{{status | emoji}} {{status | uppercase}}
{{items | count}} 個項目`}
                            </pre>
                          </div>

                          <div>
                            <strong>顏色設定：</strong>
                            <p>
                              可使用 Hex 格式 (#FF5733) 或透過 colorMap
                              映射狀態值
                            </p>
                          </div>

                          <div>
                            <strong>條件欄位：</strong>
                            <p>
                              在 fields 中加入 <code>condition</code>{" "}
                              屬性，只有當值存在時才顯示
                            </p>
                          </div>

                          <div>
                            <strong>動態欄位：</strong>
                            <p>
                              使用 <code>fieldsFromArray</code>{" "}
                              從陣列動態生成多個欄位
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* JSON 編輯器 */}
                  <div className="space-y-2">
                    <Label>Embed 設定 (JSON)</Label>
                    <Textarea
                      value={embedConfigJson}
                      onChange={(e) => syncJsonToVisual(e.target.value)}
                      className="font-mono text-xs min-h-[400px]"
                      placeholder="輸入 JSON 設定..."
                    />
                    {configError && (
                      <p className="text-xs text-red-500">{configError}</p>
                    )}
                  </div>

                  {/* 快速範本 */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        syncJsonToVisual(
                          JSON.stringify(
                            getDefaultEmbedConfig("custom"),
                            null,
                            2
                          )
                        )
                      }
                    >
                      自訂範本
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        syncJsonToVisual(
                          JSON.stringify(getDefaultEmbedConfig("raw"), null, 2)
                        )
                      }
                    >
                      原始 JSON 範本
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        syncJsonToVisual(
                          JSON.stringify(
                            {
                              username:
                                "{{repository.full_name | default: 'GitHub'}}",
                              avatar_url:
                                "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
                              embed: {
                                title:
                                  "{{action | capitalize}}: {{pull_request.title | default: issue.title}}",
                                titleUrl:
                                  "{{pull_request.html_url | default: issue.html_url}}",
                                description:
                                  "{{pull_request.body | default: issue.body | truncate: 500}}",
                                color: "{{action}}",
                                colorMap: {
                                  opened: "#2ECC71",
                                  closed: "#E74C3C",
                                  merged: "#9B59B6",
                                },
                                author: {
                                  name: "{{sender.login}}",
                                  icon_url: "{{sender.avatar_url}}",
                                },
                                footer: { text: "{{repository.full_name}}" },
                                timestamp: "auto",
                              },
                            },
                            null,
                            2
                          )
                        )
                      }
                    >
                      GitHub 範本
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClearConfig}>
                清除設定
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfigDialogOpen(false)}
              >
                取消
              </Button>
              <Button onClick={handleSaveConfig}>儲存設定</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
