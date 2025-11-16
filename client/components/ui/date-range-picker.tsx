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
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [tempDateRange, setTempDateRange] = React.useState<
    DateRange | undefined
  >(date);
  const [preset, setPreset] = React.useState<string>("custom");

  // 當外部 date 改變時，同步到臨時狀態
  React.useEffect(() => {
    setTempDateRange(date);
  }, [date]);

  // 預設範圍選項
  const presets = [
    { label: "今天", value: "today", days: 0 },
    { label: "昨天", value: "yesterday", days: 1 },
    { label: "7 天", value: "7", days: 7 },
    { label: "30 天", value: "30", days: 30 },
    { label: "90 天", value: "90", days: 90 },
    { label: "一年", value: "365", days: 365 },
    { label: "自訂", value: "custom", days: -1 },
  ];

  // 處理預設選擇
  const handlePresetChange = (value: string) => {
    setPreset(value);

    if (value === "custom") {
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

    setTempDateRange(newRange);
  };

  // 處理日曆選擇
  const handleDateSelect = (range: DateRange | undefined) => {
    setTempDateRange(range);
    setPreset("custom");
  };

  // 確認選擇
  const handleConfirm = () => {
    onDateChange?.(tempDateRange);
    setOpen(false);
  };

  // 取消選擇
  const handleCancel = () => {
    setTempDateRange(date);
    setOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full md:w-[280px] justify-start text-left font-normal text-sm",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "yyyy/MM/dd")} -{" "}
                    {format(date.to, "yyyy/MM/dd")}
                  </>
                ) : (
                  format(date.from, "yyyy/MM/dd")
                )
              ) : (
                <span>選擇日期範圍</span>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align={isMobile ? "center" : "start"}
          side={isMobile ? "bottom" : "bottom"}
        >
          <div className="flex flex-col md:flex-row">
            {/* 快速選擇 - 手機版改為水平滾動 */}
            <div className="border-b md:border-b-0 md:border-r p-2 md:p-3">
              <div className="text-xs font-medium mb-2 px-2 md:px-0">
                快速選擇
              </div>
              <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                {presets.map((p) => (
                  <Button
                    key={p.value}
                    variant={preset === p.value ? "default" : "ghost"}
                    className="whitespace-nowrap md:w-full md:justify-start text-xs md:text-sm px-2 md:px-3"
                    size="sm"
                    onClick={() => handlePresetChange(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 日曆 */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDateRange?.from}
                selected={tempDateRange}
                onSelect={handleDateSelect}
                numberOfMonths={isMobile ? 1 : 2}
                locale={zhTW}
                className={isMobile ? "scale-90" : ""}
              />

              {/* 確認/取消按鈕 */}
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleCancel}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleConfirm}
                  disabled={!tempDateRange?.from}
                >
                  確認
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
