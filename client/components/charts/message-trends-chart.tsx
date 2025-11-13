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
  return (
    <ChartContainer config={chartConfig} className="h-[350px] w-full">
      <LineChart
        data={data}
        margin={{ top: 5, right: 50, left: 10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        {/* 左側 Y 軸 - 訊息數量 */}
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
          label={{
            value: "訊息數量",
            angle: -90,
            position: "insideLeft",
            style: { textAnchor: "middle", fontSize: "12px" },
          }}
        />
        {/* 右側 Y 軸 - 活躍用戶 */}
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
          label={{
            value: "活躍用戶",
            angle: 90,
            position: "insideRight",
            style: { textAnchor: "middle", fontSize: "12px" },
          }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="messages"
          stroke="var(--color-messages)"
          strokeWidth={2}
          dot={false}
          name="訊息數量"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="activeUsers"
          stroke="var(--color-activeUsers)"
          strokeWidth={2}
          dot={false}
          name="活躍用戶"
        />
      </LineChart>
    </ChartContainer>
  );
}
