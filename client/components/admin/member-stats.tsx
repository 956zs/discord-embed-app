"use client";

import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface MemberStat {
  date: string;
  joins: number;
  leaves: number;
  memberCount: number;
  netChange: number;
}

interface MemberSummary {
  current: {
    memberCount: number;
  };
  today: {
    joins: number;
    leaves: number;
    netChange: number;
  };
  month: {
    joins: number;
    leaves: number;
    netChange: number;
  };
}

const chartConfig = {
  joins: {
    label: "加入",
    color: "hsl(142, 76%, 36%)",
  },
  leaves: {
    label: "離開",
    color: "hsl(0, 84%, 60%)",
  },
  memberCount: {
    label: "總成員數",
    color: "hsl(217, 91%, 60%)",
  },
} satisfies ChartConfig;

export function MemberStats({ guildId }: { guildId: string }) {
  const [stats, setStats] = useState<MemberStat[]>([]);
  const [summary, setSummary] = useState<MemberSummary | null>(null);
  const [days, setDays] = useState("30");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchSummary();
  }, [guildId, days, dateRange, useCustomRange]);

  const fetchStats = async () => {
    try {
      let url = `/api/welcome/${guildId}/stats`;

      if (useCustomRange && dateRange?.from) {
        const params = new URLSearchParams();
        params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
        if (dateRange.to) {
          params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
        }
        url += `?${params.toString()}`;
      } else {
        url += `?days=${days}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch member stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/welcome/${guildId}/summary`);
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("Failed to fetch member summary:", error);
    }
  };

  if (loading) {
    return <div>載入中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 摘要卡片 */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>當前成員數</CardDescription>
              <CardTitle className="text-3xl">
                {summary.current.memberCount.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>今日變化</CardDescription>
              <CardTitle className="text-3xl">
                <span
                  className={
                    summary.today.netChange >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {summary.today.netChange >= 0 ? "+" : ""}
                  {summary.today.netChange}
                </span>
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                <span className="text-green-600">+{summary.today.joins}</span>
                {" / "}
                <span className="text-red-600">-{summary.today.leaves}</span>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>本月變化</CardDescription>
              <CardTitle className="text-3xl">
                <span
                  className={
                    summary.month.netChange >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  {summary.month.netChange >= 0 ? "+" : ""}
                  {summary.month.netChange}
                </span>
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                <span className="text-green-600">+{summary.month.joins}</span>
                {" / "}
                <span className="text-red-600">-{summary.month.leaves}</span>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>增長率</CardDescription>
              <CardTitle className="text-3xl">
                {summary.current.memberCount > 0
                  ? (
                      (summary.month.netChange / summary.current.memberCount) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </CardTitle>
              <div className="text-xs text-muted-foreground">本月</div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* 趨勢圖表 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>成員變化趨勢</CardTitle>
                <CardDescription>成員加入與離開統計</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={useCustomRange ? "custom" : days}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setUseCustomRange(true);
                  } else {
                    setUseCustomRange(false);
                    setDays(value);
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">最近 7 天</SelectItem>
                  <SelectItem value="30">最近 30 天</SelectItem>
                  <SelectItem value="90">最近 90 天</SelectItem>
                  <SelectItem value="365">最近一年</SelectItem>
                  <SelectItem value="custom">自訂範圍</SelectItem>
                </SelectContent>
              </Select>
              {useCustomRange && (
                <DateRangePicker
                  date={dateRange}
                  onDateChange={(range) => {
                    setDateRange(range);
                  }}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <LineChart
              data={stats}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="joins"
                stroke="var(--color-joins)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="leaves"
                stroke="var(--color-leaves)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="memberCount"
                stroke="var(--color-memberCount)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
