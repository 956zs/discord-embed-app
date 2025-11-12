import { useState, useEffect } from "react";
import axios from "axios";
import { Smile } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmojiUsage } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface EmojiStatsProps {
  guildId: string | null;
}

type FilterType = "all" | "custom" | "unicode";

function EmojiStats({ guildId }: EmojiStatsProps) {
  const [emojis, setEmojis] = useState<EmojiUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!guildId) return;
      try {
        const response = await axios.get<EmojiUsage[]>(
          `${API_URL}/api/stats/emojis/${guildId}`
        );
        setEmojis(response.data);
      } catch (error) {
        console.error("獲取表情使用統計失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId]);

  const getFilteredEmojis = (filter: FilterType) => {
    return emojis.filter((emoji) => {
      if (filter === "custom") return emoji.isCustom;
      if (filter === "unicode") return !emoji.isCustom;
      return true;
    });
  };

  const renderEmojiList = (filteredEmojis: EmojiUsage[]) => (
    <div className="space-y-2">
      {filteredEmojis.map((emoji, index) => (
        <div
          key={`${emoji.emoji}-${index}`}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center justify-center w-8 text-muted-foreground font-medium">
            #{index + 1}
          </div>
          <div className="flex items-center justify-center w-10 h-10">
            {emoji.isCustom && emoji.url ? (
              <img
                src={emoji.url}
                alt={emoji.name}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <span className="text-2xl">{emoji.emoji}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium">{emoji.name}</div>
            <div className="text-sm text-muted-foreground">
              {emoji.count.toLocaleString()} 次使用
            </div>
          </div>
          <Badge variant="outline">{emoji.count.toLocaleString()}</Badge>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smile className="h-5 w-5" />
            表情使用排行
          </CardTitle>
          <CardDescription>載入中...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-3 w-[80px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smile className="h-5 w-5" />
          表情使用排行
        </CardTitle>
        <CardDescription>最常使用的表情統計</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="custom">自訂表情</TabsTrigger>
            <TabsTrigger value="unicode">Unicode</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            {renderEmojiList(getFilteredEmojis("all"))}
          </TabsContent>
          <TabsContent value="custom" className="mt-4">
            {renderEmojiList(getFilteredEmojis("custom"))}
          </TabsContent>
          <TabsContent value="unicode" className="mt-4">
            {renderEmojiList(getFilteredEmojis("unicode"))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default EmojiStats;
