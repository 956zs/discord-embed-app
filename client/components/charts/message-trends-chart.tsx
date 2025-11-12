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
        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="messages"
          stroke="var(--color-messages)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="activeUsers"
          stroke="var(--color-activeUsers)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
