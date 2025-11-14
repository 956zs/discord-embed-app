"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
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

  const formattedData = data.map((item) => ({
    ...item,
    displayDate: formatDate(item.date),
  }));

  return (
    <ChartContainer
      config={chartConfig}
      className="h-[300px] md:h-[350px] w-full"
    >
      <LineChart
        data={formattedData}
        margin={
          isMobile
            ? { top: 5, right: 5, left: -20, bottom: 5 }
            : { top: 5, right: 50, left: 10, bottom: 0 }
        }
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="displayDate"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-[10px] md:text-xs"
          interval={isMobile ? "preserveStartEnd" : "preserveEnd"}
          angle={isMobile ? -45 : 0}
          textAnchor={isMobile ? "end" : "middle"}
          height={isMobile ? 60 : 30}
        />
        {/* 左側 Y 軸 - 訊息數量 */}
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tickMargin={isMobile ? 0 : 8}
          className="text-[10px] md:text-xs"
          width={isMobile ? 30 : 60}
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
          tickMargin={isMobile ? 0 : 8}
          className="text-[10px] md:text-xs"
          width={isMobile ? 30 : 60}
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
          strokeWidth={isMobile ? 1.5 : 2}
          dot={false}
          name="訊息數量"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="activeUsers"
          stroke="var(--color-activeUsers)"
          strokeWidth={isMobile ? 1.5 : 2}
          dot={false}
          name="活躍用戶"
        />
      </LineChart>
    </ChartContainer>
  );
}
