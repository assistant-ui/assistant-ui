"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DatePicker({
  placeholder = "Pick a date",
  defaultValue,
  min,
  max,
  disabled,
  block,
}: {
  placeholder?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  block?: boolean;
}) {
  const [date, setDate] = useState<Date | undefined>(
    defaultValue ? new Date(defaultValue) : undefined,
  );

  const bounds: Matcher[] = [];
  if (min) bounds.push({ before: new Date(min) });
  if (max) bounds.push({ after: new Date(max) });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start gap-2 font-normal",
            block && "w-full",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="size-4" />
          {date ? format(date, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={bounds.length ? bounds : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
