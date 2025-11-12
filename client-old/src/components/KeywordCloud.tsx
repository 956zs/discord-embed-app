import { useState, useEffect } from "react";
import axios from "axios";
import { Cloud } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KeywordData } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface KeywordCloudProps {
  guildId: string | null;
}

function KeywordCloud({ guildId }: KeywordCloudProps) {
  const [words, setWords] = useState<KeywordData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!guildId) return;
      try {
        const response = await axios.get<KeywordData[]>(
          `${API_URL}/api/stats/keywords/${guildId}`
        );
        setWords(response.data);
      } catch (error) {
        console.error("獲取關鍵詞雲失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            常見關鍵詞
          </CardTitle>
          <CardDescription>載入中...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 justify-center min-h-[200px] items-center">
            {[...Array(15)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 計算字體大小（基於詞頻）
  const maxValue = Math.max(...words.map((w) => w.value));
  const minValue = Math.min(...words.map((w) => w.value));

  const getFontSize = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue);
    return 12 + normalized * 24; // 12px 到 36px
  };

  const getColor = (index: number) => {
    const colors = [
      "text-blue-500",
      "text-purple-500",
      "text-green-500",
      "text-orange-500",
      "text-pink-500",
      "text-cyan-500",
    ];
    return colors[index % colors.length];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          常見關鍵詞
        </CardTitle>
        <CardDescription>最常出現的關鍵詞</CardDescription>
      </CardHeader>
      <CardContent>
        {words.length > 0 ? (
          <div className="flex flex-wrap gap-3 justify-center items-center min-h-[200px]">
            {words.slice(0, 30).map((word, index) => (
              <span
                key={word.text}
                className={`font-semibold transition-all hover:scale-110 cursor-default ${getColor(
                  index
                )}`}
                style={{ fontSize: `${getFontSize(word.value)}px` }}
                title={`${word.text}: ${word.value} 次`}
              >
                {word.text}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">暫無數據</div>
        )}
      </CardContent>
    </Card>
  );
}

export default KeywordCloud;
