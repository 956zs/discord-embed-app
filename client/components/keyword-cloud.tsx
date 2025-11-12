"use client";

import type { WordCloudData } from "@/types";

interface KeywordCloudProps {
  data: WordCloudData[];
}

export function KeywordCloud({ data }: KeywordCloudProps) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-[250px] items-center justify-center text-muted-foreground">
        暫無關鍵字資料
      </div>
    );
  }

  const maxValue = Math.max(...data.map((w) => w.value));
  const minValue = Math.min(...data.map((w) => w.value));

  const getFontSize = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    return 0.75 + normalized * 1.5; // 0.75rem 到 2.25rem
  };

  const getColor = (index: number) => {
    const colors = [
      "text-blue-400",
      "text-purple-400",
      "text-green-400",
      "text-orange-400",
      "text-pink-400",
      "text-cyan-400",
      "text-yellow-400",
      "text-red-400",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="flex min-h-[250px] flex-wrap items-center justify-center gap-4 p-4">
      {data.slice(0, 40).map((word, index) => (
        <span
          key={`${word.text}-${index}`}
          className={`cursor-default font-bold transition-all hover:scale-110 ${getColor(
            index
          )}`}
          style={{ fontSize: `${getFontSize(word.value)}rem` }}
          title={`${word.text}: ${word.value} 次`}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
}
