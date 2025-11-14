"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { MessageTrend } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface MessageTrendsChartProps {
  data: MessageTrend[];
}

const chartConfig = {
  messages: {
    label: "訊息數量",
    color: "hsl(217, 91%, 60%)",
  },
  activeUsers: {
    label: "活躍用戶",
    color: "hsl(271, 91%, 65%)",
  },
} satisfies ChartConfig;

export function MessageTrendsChart({ data }: MessageTrendsChartProps) {
  const isMobile = useIsMobile();

  // 格式化日期顯示（手機上只顯示月/日）
  const formatDate = (dateStr: string) => {
    if (!isMobile) return dateStr;
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 手機上數據點過多時進行採樣
  const getSampledData = () => {
    if (!isMobile || data.length <= 15) return data;

    // 每隔幾個點取一個，確保包含首尾
    const step = Math.ceil(data.length / 12);
    const sampled = data.filter((_, index) => index % step === 0);

    // 確保包含最後一個點
    if (sampled[sampled.length - 1] !== data[data.length - 1]) {
      sampled.push(data[data.length - 1]);
    }

    return sampled;
  };

  const displayData = getSampledData();
  const formattedData = displayData.map((item) => ({
    ...item,
    displayDate: formatDate(item.date),
  }));

  return (
    <ChartContainer
      config={chartConfig}
      className="h-[280px] md:h-[350px] w-full"
    >
      <LineChart
        data={formattedData}
        margin={
          isMobile
            ? { top: 10, right: 10, left: -15, bottom: 0 }
            : { top: 5, right: 50, left: 10, bottom: 0 }
        }
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-muted"
          opacity={0.3}
        />
        <XAxis
          dataKey="displayDate"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-[9px] md:text-xs"
          interval={0}
          angle={isMobile ? -35 : 0}
          textAnchor={isMobile ? "end" : "middle"}
          height={isMobile ? 50 : 30}
        />
        {/* 左側 Y 軸 - 訊息數量 */}
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tickMargin={isMobile ? 2 : 8}
          className="text-[9px] md:text-xs"
          width={isMobile ? 35 : 60}
          tickCount={isMobile ? 5 : 7}
          label={
            !isMobile
              ? {
                  value: "訊息數量",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fontSize: "12px" },
                }
              : undefined
          }
        />
        {/* 右側 Y 軸 - 活躍用戶 */}
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tickMargin={isMobile ? 2 : 8}
          className="text-[9px] md:text-xs"
          width={isMobile ? 35 : 60}
          tickCount={isMobile ? 5 : 7}
          label={
            !isMobile
              ? {
                  value: "活躍用戶",
                  angle: 90,
                  position: "insideRight",
                  style: { textAnchor: "middle", fontSize: "12px" },
                }
              : undefined
          }
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          labelFormatter={(value) => {
            const item = formattedData.find((d) => d.displayDate === value);
            return item?.date || value;
          }}
        />
        {!isMobile && <ChartLegend content={<ChartLegendContent />} />}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="messages"
          stroke="var(--color-messages)"
          strokeWidth={isMobile ? 2 : 2.5}
          dot={isMobile && formattedData.length <= 7 ? { r: 3 } : false}
          name="訊息數量"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="activeUsers"
          stroke="var(--color-activeUsers)"
          strokeWidth={isMobile ? 2 : 2.5}
          dot={isMobile && formattedData.length <= 7 ? { r: 3 } : false}
          name="活躍用戶"
        />
      </LineChart>
    </ChartContainer>
  );
}
