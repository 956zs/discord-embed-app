"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface WelcomeConfig {
  guild_id: string;
  enabled: boolean;
  channel_id: string | null;
  message_template: string;
  embed_enabled: boolean;
  embed_color: string;
  embed_title: string;
  embed_description: string;
  embed_footer: string | null;
  embed_thumbnail: boolean;
  embed_image_url: string | null;
  embed_thumbnail_url: string | null;
  message_content: string | null;
  dm_enabled: boolean;
  dm_message: string | null;
  autorole_enabled: boolean;
  autorole_ids: string[];
}

interface Channel {
  id: string;
  name: string;
  type: number;
}

interface Role {
  id: string;
  name: string;
  color: number;
}

export function WelcomeConfig({ guildId }: { guildId: string }) {
  const { toast } = useToast();
  const [config, setConfig] = useState<WelcomeConfig | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channelSearchOpen, setChannelSearchOpen] = useState(false);
  const [channelFilter, setChannelFilter] = useState("");

  // 緩存鍵
  const CACHE_KEY_CHANNELS = `discord_channels_${guildId}`;
  const CACHE_KEY_ROLES = `discord_roles_${guildId}`;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 分鐘（頻道變化不頻繁）

  useEffect(() => {
    fetchConfig();
    fetchChannels();
    fetchRoles();
  }, [guildId]);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/welcome/${guildId}/config`);
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      toast({
        title: "載入失敗",
        description: "無法載入歡迎訊息配置",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async (showLoading: boolean = true) => {
    try {
      // 先檢查緩存
      const cached = localStorage.getItem(CACHE_KEY_CHANNELS);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setChannels(data);
          console.log(`✅ 從緩存載入 ${data.length} 個頻道`);
          return;
        }
      }

      if (showLoading) {
        console.log("📡 正在獲取頻道列表（可能需要 10-20 秒）...");
      }

      // 從 Discord API 獲取頻道列表
      const response = await fetch(`/api/fetch/${guildId}/channels`);
      const data = await response.json();
      const textChannels = data.filter((ch: Channel) => ch.type === 0);

      // 儲存到緩存
      localStorage.setItem(
        CACHE_KEY_CHANNELS,
        JSON.stringify({ data: textChannels, timestamp: Date.now() })
      );

      setChannels(textChannels);
      console.log(`✅ 已載入並緩存 ${textChannels.length} 個頻道`);
    } catch (error) {
      console.error("Failed to fetch channels:", error);
      toast({
        title: "載入頻道失敗",
        description: "無法獲取頻道列表",
        variant: "destructive",
      });
    }
  };

  const fetchRoles = async () => {
    try {
      // 先檢查緩存
      const cached = localStorage.getItem(CACHE_KEY_ROLES);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setRoles(data);
          return;
        }
      }

      // 從 Discord API 獲取身分組列表
      const response = await fetch(`/api/fetch/${guildId}/roles`);
      const data = await response.json();
      const filteredRoles = data.filter(
        (role: Role) => role.name !== "@everyone"
      );

      // 儲存到緩存
      localStorage.setItem(
        CACHE_KEY_ROLES,
        JSON.stringify({ data: filteredRoles, timestamp: Date.now() })
      );

      setRoles(filteredRoles);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      toast({
        title: "載入身分組失敗",
        description: "無法獲取身分組列表",
        variant: "destructive",
      });
    }
  };

  // 手動刷新緩存
  const refreshCache = async () => {
    localStorage.removeItem(CACHE_KEY_CHANNELS);
    localStorage.removeItem(CACHE_KEY_ROLES);
    await Promise.all([fetchChannels(), fetchRoles()]);
    toast({
      title: "刷新完成",
      description: "頻道和身分組列表已更新",
    });
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/welcome/${guildId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast({
          title: "儲存成功",
          description: "歡迎訊息配置已更新",
        });
      } else {
        throw new Error("Save failed");
      }
    } catch (error) {
      toast({
        title: "儲存失敗",
        description: "無法儲存配置",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<WelcomeConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // 過濾頻道
  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(channelFilter.toLowerCase())
  );

  if (loading) {
    return <div>載入中...</div>;
  }

  if (!config) {
    return <div>無法載入配置</div>;
  }

  return (
    <div className="space-y-6">
      {/* 基本設定 */}
      <Card>
        <CardHeader>
          <CardTitle>基本設定</CardTitle>
          <CardDescription>配置歡迎訊息的基本選項</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>啟用歡迎訊息</Label>
              <p className="text-sm text-muted-foreground">
                當新成員加入時發送歡迎訊息
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked: boolean) =>
                updateConfig({ enabled: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>歡迎訊息頻道</Label>
            <div className="space-y-2">
              <Input
                placeholder="🔍 搜尋頻道..."
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="h-9"
              />
              <Select
                value={config.channel_id || ""}
                onValueChange={(value) => updateConfig({ channel_id: value })}
                open={channelSearchOpen}
                onOpenChange={setChannelSearchOpen}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇頻道">
                    {config.channel_id
                      ? `#${
                          channels.find((ch) => ch.id === config.channel_id)
                            ?.name || config.channel_id
                        }`
                      : "選擇頻道"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {filteredChannels.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      找不到符合的頻道
                    </div>
                  ) : (
                    filteredChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        #{channel.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {channelFilter && (
                <p className="text-xs text-muted-foreground">
                  顯示 {filteredChannels.length} / {channels.length} 個頻道
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 訊息內容 */}
      <Card>
        <CardHeader>
          <CardTitle>訊息內容</CardTitle>
          <CardDescription>
            可用變數: {"{user}"} {"{username}"} {"{displayname}"} {"{server}"}{" "}
            {"{memberCount}"} {"{userAvatar}"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>使用 Embed 格式</Label>
            <Switch
              checked={config.embed_enabled}
              onCheckedChange={(checked) =>
                updateConfig({ embed_enabled: checked })
              }
            />
          </div>

          {config.embed_enabled ? (
            <>
              <div className="space-y-2">
                <Label>Embed 顏色</Label>
                <Input
                  type="color"
                  value={config.embed_color}
                  onChange={(e) =>
                    updateConfig({ embed_color: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>標題</Label>
                <Input
                  value={config.embed_title}
                  onChange={(e) =>
                    updateConfig({ embed_title: e.target.value })
                  }
                  placeholder="歡迎加入！"
                />
              </div>

              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  value={config.embed_description}
                  onChange={(e) =>
                    updateConfig({ embed_description: e.target.value })
                  }
                  placeholder="歡迎 {user} 加入 {server}！"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>頁腳（選填）</Label>
                <Input
                  value={config.embed_footer || ""}
                  onChange={(e) =>
                    updateConfig({ embed_footer: e.target.value })
                  }
                  placeholder="享受你的旅程！"
                />
              </div>

              <div className="space-y-2">
                <Label>Embed 主圖片 URL（選填）</Label>
                <Input
                  value={config.embed_image_url || ""}
                  onChange={(e) =>
                    updateConfig({ embed_image_url: e.target.value })
                  }
                  placeholder="https://example.com/image.png 或使用 {userAvatar}"
                />
                <p className="text-xs text-muted-foreground">
                  支援變數替換。留空則不顯示主圖片。
                </p>
              </div>

              <div className="space-y-2">
                <Label>Embed 縮圖 URL（選填）</Label>
                <Input
                  value={config.embed_thumbnail_url || ""}
                  onChange={(e) =>
                    updateConfig({ embed_thumbnail_url: e.target.value })
                  }
                  placeholder="https://example.com/thumb.png 或使用 {userAvatar}"
                />
                <p className="text-xs text-muted-foreground">
                  支援變數替換。若未設定且啟用下方開關，則使用用戶頭像。
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>自動使用用戶頭像作為縮圖</Label>
                  <p className="text-xs text-muted-foreground">
                    僅當縮圖 URL 未設定時生效
                  </p>
                </div>
                <Switch
                  checked={config.embed_thumbnail}
                  onCheckedChange={(checked) =>
                    updateConfig({ embed_thumbnail: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>附帶一般訊息（選填）</Label>
                <Textarea
                  value={config.message_content || ""}
                  onChange={(e) =>
                    updateConfig({ message_content: e.target.value })
                  }
                  placeholder="除了 Embed 外，還可以發送一般訊息..."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  使用 Embed 時，可額外發送這段一般訊息。支援變數替換。
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>訊息內容</Label>
              <Textarea
                value={config.message_template}
                onChange={(e) =>
                  updateConfig({ message_template: e.target.value })
                }
                placeholder="歡迎 {user} 加入 {server}！"
                rows={4}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 私訊設定 */}
      <Card>
        <CardHeader>
          <CardTitle>私訊設定</CardTitle>
          <CardDescription>向新成員發送私訊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>啟用私訊</Label>
            <Switch
              checked={config.dm_enabled}
              onCheckedChange={(checked) =>
                updateConfig({ dm_enabled: checked })
              }
            />
          </div>

          {config.dm_enabled && (
            <div className="space-y-2">
              <Label>私訊內容</Label>
              <Textarea
                value={config.dm_message || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  updateConfig({ dm_message: e.target.value })
                }
                placeholder="歡迎加入我們的社群！"
                rows={4}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自動身分組 */}
      <Card>
        <CardHeader>
          <CardTitle>自動身分組</CardTitle>
          <CardDescription>自動給予新成員身分組</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>啟用自動身分組</Label>
            <Switch
              checked={config.autorole_enabled}
              onCheckedChange={(checked) =>
                updateConfig({ autorole_enabled: checked })
              }
            />
          </div>

          {config.autorole_enabled && (
            <div className="space-y-2">
              <Label>選擇身分組</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Badge
                    key={role.id}
                    variant={
                      config.autorole_ids.includes(role.id)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => {
                      const newRoles = config.autorole_ids.includes(role.id)
                        ? config.autorole_ids.filter((id) => id !== role.id)
                        : [...config.autorole_ids, role.id];
                      updateConfig({ autorole_ids: newRoles });
                    }}
                  >
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 儲存按鈕 */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={fetchConfig}>
          重置
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "儲存中..." : "儲存配置"}
        </Button>
      </div>
    </div>
  );
}
