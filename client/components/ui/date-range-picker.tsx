"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { zhTW } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  className?: string;
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(date);
  const [preset, setPreset] = React.useState<string>("30");

  // 預設範圍選項
  const presets = [
    { label: "今天", value: "today", days: 0 },
    { label: "昨天", value: "yesterday", days: 1 },
    { label: "最近 7 天", value: "7", days: 7 },
    { label: "最近 30 天", value: "30", days: 30 },
    { label: "最近 90 天", value: "90", days: 90 },
    { label: "最近一年", value: "365", days: 365 },
    { label: "自訂範圍", value: "custom", days: -1 },
  ];

  // 處理預設選擇
  const handlePresetChange = (value: string) => {
    setPreset(value);

    if (value === "custom") {
      // 自訂範圍，不更新日期
      return;
    }

    const selectedPreset = presets.find((p) => p.value === value);
    if (!selectedPreset) return;

    let newRange: DateRange | undefined;

    if (value === "today") {
      const today = new Date();
      newRange = { from: today, to: today };
    } else if (value === "yesterday") {
      const yesterday = addDays(new Date(), -1);
      newRange = { from: yesterday, to: yesterday };
    } else {
      const today = new Date();
      const from = addDays(today, -selectedPreset.days);
      newRange = { from, to: today };
    }

    setDateRange(newRange);
    onDateChange?.(newRange);
  };

  // 處理日曆選擇
  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    setPreset("custom");
    onDateChange?.(range);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "PPP", { locale: zhTW })} -{" "}
                  {format(dateRange.to, "PPP", { locale: zhTW })}
                </>
              ) : (
                format(dateRange.from, "PPP", { locale: zhTW })
              )
            ) : (
              <span>選擇日期範圍</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r p-3 space-y-2">
              <div className="text-sm font-medium mb-2">快速選擇</div>
              {presets.map((p) => (
                <Button
                  key={p.value}
                  variant={preset === p.value ? "default" : "ghost"}
                  className="w-full justify-start"
                  size="sm"
                  onClick={() => handlePresetChange(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              locale={zhTW}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
