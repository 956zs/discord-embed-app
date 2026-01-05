"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Plus,
  X,
  RefreshCw,
  Eye,
  Save,
  AtSign,
  Users,
  MessageSquare,
  Type,
} from "lucide-react";

interface WebhookTemplate {
  mentionUsers: string[];
  mentionRoles: string[];
  customContent: string;
  embedTitle: string;
  embedFooter: string;
}

interface WebhookPreview {
  content?: string;
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    fields: Array<{
      name: string;
      value: string;
      inline: boolean;
    }>;
    footer: {
      text: string;
    };
  }>;
}

export function WebhookTemplate() {
  const { toast } = useToast();
  const [template, setTemplate] = useState<WebhookTemplate>({
    mentionUsers: [],
    mentionRoles: [],
    customContent: "",
    embedTitle: "",
    embedFooter: "Discord 統計系統監控",
  });
  const [preview, setPreview] = useState<WebhookPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新增 ID 的輸入狀態
  const [newUserId, setNewUserId] = useState("");
  const [newRoleId, setNewRoleId] = useState("");

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/metrics/webhook/template");

      if (response.status === 503) {
        setError("Webhook 通知系統未啟用。請確認 WEBHOOK_ENABLED=true");
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
      }
    } catch (err) {
      setError("無法連接到 Webhook 模板服務");
      console.error("獲取 Webhook 模板失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/metrics/webhook/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
        toast({
          title: "儲存成功",
          description: data.savedToDatabase
            ? "Webhook 模板已儲存到資料庫"
            : "模板已更新，但資料庫儲存失敗",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "儲存失敗",
          description: errorData.message || errorData.error,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("儲存模板失敗:", err);
      toast({
        title: "儲存失敗",
        description: "無法連接到伺服器",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const fetchPreview = async () => {
    try {
      const response = await fetch("/api/metrics/webhook/template/preview", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data.preview);
      }
    } catch (err) {
      console.error("獲取預覽失敗:", err);
    }
  };

  const addUserId = () => {
    const trimmedId = newUserId.trim();
    if (!trimmedId) return;

    if (!/^\d{17,19}$/.test(trimmedId)) {
      toast({
        title: "ID 格式錯誤",
        description: "Discord ID 應為 17-19 位數字",
        variant: "destructive",
      });
      return;
    }

    if (template.mentionUsers.includes(trimmedId)) {
      toast({
        title: "ID 已存在",
        description: "此用戶 ID 已在列表中",
        variant: "destructive",
      });
      return;
    }

    setTemplate({
      ...template,
      mentionUsers: [...template.mentionUsers, trimmedId],
    });
    setNewUserId("");
  };

  const removeUserId = (id: string) => {
    setTemplate({
      ...template,
      mentionUsers: template.mentionUsers.filter((uid) => uid !== id),
    });
  };

  const addRoleId = () => {
    const trimmedId = newRoleId.trim();
    if (!trimmedId) return;

    if (!/^\d{17,19}$/.test(trimmedId)) {
      toast({
        title: "ID 格式錯誤",
        description: "Discord ID 應為 17-19 位數字",
        variant: "destructive",
      });
      return;
    }

    if (template.mentionRoles.includes(trimmedId)) {
      toast({
        title: "ID 已存在",
        description: "此角色 ID 已在列表中",
        variant: "destructive",
      });
      return;
    }

    setTemplate({
      ...template,
      mentionRoles: [...template.mentionRoles, trimmedId],
    });
    setNewRoleId("");
  };

  const removeRoleId = (id: string) => {
    setTemplate({
      ...template,
      mentionRoles: template.mentionRoles.filter((rid) => rid !== id),
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Webhook 通知模板
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
            <Bell className="h-5 w-5" />
            Webhook 通知模板
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Webhook 通知模板
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPreview}
              >
                <Eye className="h-4 w-4 mr-1" />
                預覽
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTemplate}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tag 用戶 */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <AtSign className="h-4 w-4" />
              Tag 用戶
            </Label>
            <p className="text-xs text-muted-foreground">
              輸入 Discord 用戶 ID（17-19 位數字），通知時會 @mention 這些用戶
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="輸入用戶 ID，如 123456789012345678"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addUserId()}
              />
              <Button variant="outline" size="icon" onClick={addUserId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {template.mentionUsers.map((id) => (
                <Badge key={id} variant="secondary" className="gap-1">
                  <AtSign className="h-3 w-3" />
                  {id}
                  <button
                    onClick={() => removeUserId(id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {template.mentionUsers.length === 0 && (
                <span className="text-sm text-muted-foreground">尚未設定</span>
              )}
            </div>
          </div>

          {/* Tag 角色 */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tag 角色
            </Label>
            <p className="text-xs text-muted-foreground">
              輸入 Discord 角色 ID（17-19 位數字），通知時會 @mention 這些角色
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="輸入角色 ID，如 123456789012345678"
                value={newRoleId}
                onChange={(e) => setNewRoleId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRoleId()}
              />
              <Button variant="outline" size="icon" onClick={addRoleId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {template.mentionRoles.map((id) => (
                <Badge key={id} variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {id}
                  <button
                    onClick={() => removeRoleId(id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {template.mentionRoles.length === 0 && (
                <span className="text-sm text-muted-foreground">尚未設定</span>
              )}
            </div>
          </div>

          {/* 自訂內容 */}
          <div className="space-y-2">
            <Label htmlFor="customContent" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              自訂通知內容
            </Label>
            <Textarea
              id="customContent"
              placeholder="在 Embed 上方顯示的自訂文字（選填）"
              value={template.customContent}
              onChange={(e) =>
                setTemplate({ ...template, customContent: e.target.value })
              }
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              此內容會顯示在 Embed 上方，與 @mention 一起顯示
            </p>
          </div>

          {/* 自訂標題 */}
          <div className="space-y-2">
            <Label htmlFor="embedTitle" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              自訂 Embed 標題
            </Label>
            <Input
              id="embedTitle"
              placeholder="留空使用預設標題「系統告警 - {級別}」"
              value={template.embedTitle}
              onChange={(e) =>
                setTemplate({ ...template, embedTitle: e.target.value })
              }
            />
          </div>

          {/* 自訂頁尾 */}
          <div className="space-y-2">
            <Label htmlFor="embedFooter">自訂 Embed 頁尾</Label>
            <Input
              id="embedFooter"
              placeholder="預設為「Discord 統計系統監控」"
              value={template.embedFooter}
              onChange={(e) =>
                setTemplate({ ...template, embedFooter: e.target.value })
              }
            />
          </div>

          {/* 儲存按鈕 */}
          <div className="flex justify-end">
            <Button onClick={saveTemplate} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "儲存中..." : "儲存設定"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 預覽區域 */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-5 w-5" />
              Webhook 訊息預覽
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-[#36393f] rounded-lg p-4 text-white font-sans">
              {/* Content (mentions) */}
              {preview.content && (
                <p className="mb-2 text-[#dcddde]">{preview.content}</p>
              )}

              {/* Embed */}
              {preview.embeds[0] && (
                <div
                  className="border-l-4 rounded bg-[#2f3136] p-3"
                  style={{
                    borderColor: `#${preview.embeds[0].color.toString(16).padStart(6, "0")}`,
                  }}
                >
                  <h4 className="font-semibold text-white mb-2">
                    {preview.embeds[0].title}
                  </h4>
                  <p className="text-[#dcddde] text-sm mb-3">
                    {preview.embeds[0].description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {preview.embeds[0].fields.slice(0, 2).map((field, i) => (
                      <div key={i}>
                        <span className="text-[#72767d] text-xs">{field.name}</span>
                        <p className="text-[#dcddde]">{field.value}</p>
                      </div>
                    ))}
                  </div>
                  {preview.embeds[0].footer && (
                    <div className="mt-3 pt-2 border-t border-[#4f545c] text-xs text-[#72767d]">
                      {preview.embeds[0].footer.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
