"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { type DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { toUTC8String } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface DateTimePickerProps {
  value?: string; // ISO string
  onChange?: (datetime: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  disabled,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const dateValue = value ? new Date(value) : undefined;
  const selectedHour = dateValue
    ? dateValue.getHours().toString().padStart(2, "0")
    : null;
  const selectedMinute = dateValue
    ? (Math.floor(dateValue.getMinutes() / 5) * 5).toString().padStart(2, "0")
    : null;

  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );
  const minutes = Array.from({ length: 12 }, (_, i) =>
    (i * 5).toString().padStart(2, "0"),
  );

  const formatDisplay = (iso: string) => {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${format(d, "PPP")} at ${displayHour}:${m} ${ampm}`;
  };

  const buildISO = (date: Date, hour: string, minute: string) => {
    const d = new Date(date);
    d.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
    return toUTC8String(d);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const hr = selectedHour || "09";
    const min = selectedMinute || "00";
    onChange?.(buildISO(date, hr, min));
  };

  const handleHourSelect = (hour: string) => {
    const d = dateValue || new Date();
    const min = selectedMinute || "00";
    onChange?.(buildISO(d, hour, min));
  };

  const handleMinuteSelect = (minute: string) => {
    const d = dateValue || new Date();
    const hr = selectedHour || "09";
    onChange?.(buildISO(d, hr, minute));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={handleDateSelect}
            captionLayout="dropdown"
            initialFocus
          />
          <div className="flex border-l">
            <div className="flex flex-col">
              <div className="text-muted-foreground border-b px-3 py-2 text-center text-xs font-medium">
                Hour
              </div>
              <ScrollArea className="h-[272px]">
                <div className="flex flex-col p-1">
                  {hours.map((hour) => {
                    const h = parseInt(hour, 10);
                    const ampm = h >= 12 ? "PM" : "AM";
                    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return (
                      <Button
                        key={hour}
                        variant={selectedHour === hour ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "w-full justify-start text-xs",
                          selectedHour === hour && "font-semibold",
                        )}
                        onClick={() => handleHourSelect(hour)}
                      >
                        {displayHour} {ampm}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            <div className="flex flex-col border-l">
              <div className="text-muted-foreground border-b px-3 py-2 text-center text-xs font-medium">
                Min
              </div>
              <ScrollArea className="h-[272px]">
                <div className="flex flex-col p-1">
                  {minutes.map((minute) => (
                    <Button
                      key={minute}
                      variant={selectedMinute === minute ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-16 justify-center text-xs",
                        selectedMinute === minute && "font-semibold",
                      )}
                      onClick={() => handleMinuteSelect(minute)}
                    >
                      :{minute}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between p-2">
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {value ? formatDisplay(value) : "No selection"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground text-xs"
            onClick={() => {
              onChange?.(undefined);
              setOpen(false);
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DateTimeRangePickerProps {
  value?: { from?: string; to?: string }; // ISO strings
  onChange?: (range: { from?: string; to?: string } | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateTimeRangePicker({
  value,
  onChange,
  placeholder = "Pick date & time range",
  disabled,
  className,
}: DateTimeRangePickerProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <div className="text-muted-foreground mb-1 text-xs font-medium">
            From
          </div>
          <DateTimePicker
            value={value?.from}
            onChange={(from) => onChange?.({ ...value, from })}
            placeholder="Start date & time"
            disabled={disabled}
          />
        </div>
        <div className="text-muted-foreground hidden sm:block sm:pb-2">–</div>
        <div className="flex-1">
          <div className="text-muted-foreground mb-1 text-xs font-medium">
            To
          </div>
          <DateTimePicker
            value={value?.to}
            onChange={(to) => onChange?.({ ...value, to })}
            placeholder="End date & time"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
