"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChannelUsage } from "@/types";

interface ChannelUsageChartProps {
  data: ChannelUsage[];
}

const chartConfig = {
  messageCount: {
    label: "訊息數量",
    color: "hsl(271, 91%, 65%)",
  },
} satisfies ChartConfig;

export function ChannelUsageChart({ data }: ChannelUsageChartProps) {
  const chartData = data.map((channel) => ({
    name: channel.name,
    messageCount: channel.messageCount,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[350px] w-full">
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
          angle={-45}
          textAnchor="end"
          height={80}
          tickFormatter={(value) => `#${value}`}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          cursor={{ fill: "hsl(var(--muted))" }}
        />
        <Bar
          dataKey="messageCount"
          fill="var(--color-messageCount)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
