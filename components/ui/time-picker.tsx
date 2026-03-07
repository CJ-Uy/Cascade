"use client";

import * as React from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value?: string; // "HH:mm" format (24h)
  onChange?: (time: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  disabled,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );
  const minutes = Array.from({ length: 12 }, (_, i) =>
    (i * 5).toString().padStart(2, "0"),
  );

  const selectedHour = value ? value.split(":")[0] : null;
  const selectedMinute = value ? value.split(":")[1] : null;

  const formatDisplayTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m} ${ampm}`;
  };

  const handleHourSelect = (hour: string) => {
    const min = selectedMinute || "00";
    onChange?.(`${hour}:${min}`);
  };

  const handleMinuteSelect = (minute: string) => {
    const hr = selectedHour || "09";
    onChange?.(`${hr}:${minute}`);
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
          <Clock className="mr-2 h-4 w-4" />
          {value ? formatDisplayTime(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex gap-0 divide-x">
          <div className="flex flex-col">
            <div className="text-muted-foreground border-b px-3 py-2 text-center text-xs font-medium">
              Hour
            </div>
            <ScrollArea className="h-56">
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
          <div className="flex flex-col">
            <div className="text-muted-foreground border-b px-3 py-2 text-center text-xs font-medium">
              Min
            </div>
            <ScrollArea className="h-56">
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
        <div className="border-t p-2 text-center">
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

interface TimeRangePickerProps {
  value?: { from?: string; to?: string }; // { from: "HH:mm", to: "HH:mm" }
  onChange?: (range: { from?: string; to?: string } | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimeRangePicker({
  value,
  onChange,
  placeholder = "Pick a time range",
  disabled,
  className,
}: TimeRangePickerProps) {
  const formatDisplayTime = (time: string) => {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m} ${ampm}`;
  };

  const displayValue = () => {
    if (!value?.from) return null;
    if (value.to) {
      return `${formatDisplayTime(value.from)} – ${formatDisplayTime(value.to)}`;
    }
    return formatDisplayTime(value.from);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="text-muted-foreground mb-1 text-xs font-medium">
            From
          </div>
          <TimePicker
            value={value?.from}
            onChange={(from) => onChange?.({ ...value, from })}
            placeholder="Start time"
            disabled={disabled}
          />
        </div>
        <div className="text-muted-foreground mt-5">–</div>
        <div className="flex-1">
          <div className="text-muted-foreground mb-1 text-xs font-medium">
            To
          </div>
          <TimePicker
            value={value?.to}
            onChange={(to) => onChange?.({ ...value, to })}
            placeholder="End time"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
