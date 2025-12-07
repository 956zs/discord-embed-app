"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

interface EmbedAuthor {
  name: string;
  url?: string;
  icon_url?: string;
}

interface EmbedFooter {
  text: string;
  icon_url?: string;
}

interface EmbedData {
  username?: string;
  avatar_url?: string;
  content?: string;
  title?: string;
  titleUrl?: string;
  description?: string;
  color?: string;
  thumbnail?: string;
  image?: string;
  author?: EmbedAuthor;
  footer?: EmbedFooter;
  timestamp?: boolean;
  fields: EmbedField[];
}

interface EmbedBuilderProps {
  value: EmbedData;
  onChange: (data: EmbedData) => void;
  showVariableHints?: boolean;
}

const DEFAULT_EMBED: EmbedData = {
  username: "",
  avatar_url: "",
  content: "",
  title: "",
  titleUrl: "",
  description: "",
  color: "#5865F2",
  thumbnail: "",
  image: "",
  author: { name: "", url: "", icon_url: "" },
  footer: { text: "", icon_url: "" },
  timestamp: true,
  fields: [],
};

export function EmbedBuilder({
  value,
  onChange,
  showVariableHints = true,
}: EmbedBuilderProps) {
  const data = { ...DEFAULT_EMBED, ...value };

  const updateField = <K extends keyof EmbedData>(
    key: K,
    val: EmbedData[K]
  ) => {
    onChange({ ...data, [key]: val });
  };

  const addField = () => {
    onChange({
      ...data,
      fields: [
        ...data.fields,
        { name: "欄位標題", value: "欄位內容", inline: false },
      ],
    });
  };

  const updateEmbedField = (index: number, field: Partial<EmbedField>) => {
    const newFields = [...data.fields];
    newFields[index] = { ...newFields[index], ...field };
    onChange({ ...data, fields: newFields });
  };

  const removeField = (index: number) => {
    onChange({ ...data, fields: data.fields.filter((_, i) => i !== index) });
  };

  // 解析顏色為 hex
  const parseColor = (color: string | undefined): string => {
    if (!color) return "#5865F2";
    if (color.startsWith("#")) return color;
    if (color.startsWith("{{")) return "#5865F2"; // 變數，使用預設色
    return `#${parseInt(color, 10).toString(16).padStart(6, "0")}`;
  };

  const embedColor = parseColor(data.color);

  return (
    <div className="space-y-4">
      {/* 變數提示 */}
      {showVariableHints && (
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          💡 可使用變數語法：
          <code className="bg-background px-1 rounded">
            {"{{path.to.value}}"}
          </code>
          ，例如{" "}
          <code className="bg-background px-1 rounded">
            {"{{event.title}}"}
          </code>
        </div>
      )}

      {/* 預覽區域 */}
      <div className="bg-[#313338] rounded-lg p-4 text-white">
        {/* Webhook 使用者名稱 */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-lg shrink-0">
            {data.avatar_url ? (
              <img
                src={data.avatar_url}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              "🤖"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">
                {data.username || "Webhook"}
              </span>
              <Badge className="bg-[#5865F2] text-white text-[10px] px-1 py-0">
                BOT
              </Badge>
              <span className="text-xs text-gray-400">今天 12:00</span>
            </div>

            {/* Content (純文字訊息) */}
            {data.content && (
              <p className="text-gray-200 mt-1 text-sm">{data.content}</p>
            )}

            {/* Embed */}
            <div
              className="mt-2 rounded overflow-hidden max-w-[520px]"
              style={{ borderLeft: `4px solid ${embedColor}` }}
            >
              <div className="bg-[#2b2d31] p-3">
                {/* Author */}
                {data.author?.name && (
                  <div className="flex items-center gap-2 mb-2">
                    {data.author.icon_url && (
                      <img
                        src={data.author.icon_url}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <span className="text-xs text-gray-300 hover:underline cursor-pointer">
                      {data.author.name}
                    </span>
                  </div>
                )}

                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    {data.title && (
                      <a
                        href={data.titleUrl || "#"}
                        className="text-[#00a8fc] font-semibold hover:underline block mb-1"
                      >
                        {data.title}
                      </a>
                    )}

                    {/* Description */}
                    {data.description && (
                      <p className="text-sm text-gray-300 whitespace-pre-wrap mb-2">
                        {data.description}
                      </p>
                    )}

                    {/* Fields */}
                    {data.fields.length > 0 && (
                      <div
                        className="grid gap-2 mt-2"
                        style={{
                          gridTemplateColumns: data.fields.some((f) => f.inline)
                            ? "repeat(3, 1fr)"
                            : "1fr",
                        }}
                      >
                        {data.fields.map((field, i) => (
                          <div
                            key={i}
                            className={field.inline ? "" : "col-span-full"}
                          >
                            <div className="text-xs text-gray-400 font-semibold mb-0.5">
                              {field.name}
                            </div>
                            <div className="text-sm text-gray-200">
                              {field.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Thumbnail */}
                  {data.thumbnail && (
                    <div className="shrink-0">
                      <img
                        src={data.thumbnail}
                        alt=""
                        className="w-20 h-20 rounded object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Image */}
                {data.image && (
                  <img
                    src={data.image}
                    alt=""
                    className="mt-3 rounded max-w-full max-h-[300px] object-contain"
                  />
                )}

                {/* Footer */}
                {(data.footer?.text || data.timestamp) && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                    {data.footer?.icon_url && (
                      <img
                        src={data.footer.icon_url}
                        alt=""
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    {data.footer?.text && <span>{data.footer.text}</span>}
                    {data.footer?.text && data.timestamp && <span>•</span>}
                    {data.timestamp && (
                      <span>{new Date().toLocaleDateString()}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 編輯區域 */}
      <div className="space-y-4 border rounded-lg p-4">
        <h4 className="font-medium text-sm">訊息設定</h4>

        {/* 基本設定 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Bot 名稱</Label>
            <Input
              value={data.username || ""}
              onChange={(e) => updateField("username", e.target.value)}
              placeholder="Webhook"
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Bot 頭像 URL</Label>
            <Input
              value={data.avatar_url || ""}
              onChange={(e) => updateField("avatar_url", e.target.value)}
              placeholder="https://..."
              className="text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">純文字訊息 (Content)</Label>
          <Textarea
            value={data.content || ""}
            onChange={(e) => updateField("content", e.target.value)}
            placeholder="Embed 外的純文字訊息..."
            rows={2}
            className="text-sm"
          />
        </div>

        <hr className="my-4" />
        <h4 className="font-medium text-sm">Embed 設定</h4>

        {/* Author */}
        <div className="space-y-2">
          <Label className="text-xs">Author</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={data.author?.name || ""}
              onChange={(e) =>
                updateField("author", { ...data.author, name: e.target.value })
              }
              placeholder="名稱"
              className="text-sm"
            />
            <Input
              value={data.author?.icon_url || ""}
              onChange={(e) =>
                updateField("author", {
                  ...data.author,
                  icon_url: e.target.value,
                })
              }
              placeholder="圖示 URL"
              className="text-sm"
            />
            <Input
              value={data.author?.url || ""}
              onChange={(e) =>
                updateField("author", { ...data.author, url: e.target.value })
              }
              placeholder="連結 URL"
              className="text-sm"
            />
          </div>
        </div>

        {/* Title & URL */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">標題</Label>
            <Input
              value={data.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Embed 標題"
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">標題連結</Label>
            <Input
              value={data.titleUrl || ""}
              onChange={(e) => updateField("titleUrl", e.target.value)}
              placeholder="https://..."
              className="text-sm"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="text-xs">描述</Label>
          <Textarea
            value={data.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Embed 描述內容..."
            rows={3}
            className="text-sm"
          />
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label className="text-xs">側邊顏色</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={embedColor}
              onChange={(e) => updateField("color", e.target.value)}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              value={data.color || ""}
              onChange={(e) => updateField("color", e.target.value)}
              placeholder="#5865F2 或 {{status}}"
              className="text-sm flex-1"
            />
          </div>
        </div>

        {/* Images */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">縮圖 (右上角)</Label>
            <Input
              value={data.thumbnail || ""}
              onChange={(e) => updateField("thumbnail", e.target.value)}
              placeholder="https://..."
              className="text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">大圖 (底部)</Label>
            <Input
              value={data.image || ""}
              onChange={(e) => updateField("image", e.target.value)}
              placeholder="https://..."
              className="text-sm"
            />
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">欄位 (Fields)</Label>
            <Button variant="outline" size="sm" onClick={addField}>
              <Plus className="h-3 w-3 mr-1" />
              新增欄位
            </Button>
          </div>

          {data.fields.map((field, index) => (
            <div
              key={index}
              className="flex gap-2 items-start bg-muted p-2 rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground mt-2 cursor-grab" />
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  value={field.name}
                  onChange={(e) =>
                    updateEmbedField(index, { name: e.target.value })
                  }
                  placeholder="欄位標題"
                  className="text-sm"
                />
                <Input
                  value={field.value}
                  onChange={(e) =>
                    updateEmbedField(index, { value: e.target.value })
                  }
                  placeholder="欄位內容"
                  className="text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">並排</Label>
                <Switch
                  checked={field.inline}
                  onCheckedChange={(checked) =>
                    updateEmbedField(index, { inline: checked })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(index)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="space-y-2">
          <Label className="text-xs">Footer</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={data.footer?.text || ""}
              onChange={(e) =>
                updateField("footer", { ...data.footer, text: e.target.value })
              }
              placeholder="Footer 文字"
              className="text-sm"
            />
            <Input
              value={data.footer?.icon_url || ""}
              onChange={(e) =>
                updateField("footer", {
                  ...data.footer,
                  icon_url: e.target.value,
                })
              }
              placeholder="Footer 圖示 URL"
              className="text-sm"
            />
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2">
          <Switch
            checked={data.timestamp || false}
            onCheckedChange={(checked) => updateField("timestamp", checked)}
          />
          <Label className="text-xs">顯示時間戳</Label>
        </div>
      </div>
    </div>
  );
}

// 將 EmbedData 轉換為 embedConfig JSON 格式
export function embedDataToConfig(data: EmbedData): object {
  const config: any = {};

  if (data.username) config.username = data.username;
  if (data.avatar_url) config.avatar_url = data.avatar_url;
  if (data.content) config.content = data.content;

  const embed: any = {};
  if (data.title) embed.title = data.title;
  if (data.titleUrl) embed.titleUrl = data.titleUrl;
  if (data.description) embed.description = data.description;
  if (data.color) embed.color = data.color;
  if (data.thumbnail) embed.thumbnail = data.thumbnail;
  if (data.image) embed.image = data.image;

  if (data.author?.name) {
    embed.author = {
      name: data.author.name,
      ...(data.author.url && { url: data.author.url }),
      ...(data.author.icon_url && { icon_url: data.author.icon_url }),
    };
  }

  if (data.footer?.text) {
    embed.footer = {
      text: data.footer.text,
      ...(data.footer.icon_url && { icon_url: data.footer.icon_url }),
    };
  }

  if (data.timestamp) embed.timestamp = "auto";

  if (data.fields.length > 0) {
    embed.fields = data.fields.map((f) => ({
      name: f.name,
      value: f.value,
      inline: f.inline,
    }));
  }

  if (Object.keys(embed).length > 0) {
    config.embed = embed;
  }

  return config;
}

// 將 embedConfig JSON 轉換為 EmbedData
export function configToEmbedData(config: any): EmbedData {
  const data: EmbedData = {
    ...DEFAULT_EMBED,
    username: config.username || "",
    avatar_url: config.avatar_url || "",
    content: config.content || "",
  };

  if (config.embed) {
    const e = config.embed;
    data.title = e.title || "";
    data.titleUrl = e.titleUrl || e.url || "";
    data.description = e.description || "";
    data.color = e.color || "#5865F2";
    data.thumbnail = e.thumbnail || "";
    data.image = e.image || "";

    if (e.author) {
      data.author = {
        name: e.author.name || "",
        url: e.author.url || "",
        icon_url: e.author.icon_url || "",
      };
    }

    if (e.footer) {
      if (typeof e.footer === "string") {
        data.footer = { text: e.footer, icon_url: "" };
      } else {
        data.footer = {
          text: e.footer.text || "",
          icon_url: e.footer.icon_url || "",
        };
      }
    }

    data.timestamp = e.timestamp === "auto" || e.timestamp === true;

    if (e.fields && Array.isArray(e.fields)) {
      data.fields = e.fields.map((f: any) => ({
        name: f.name || "",
        value: f.value || "",
        inline: f.inline || false,
      }));
    }
  }

  return data;
}
