"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label ?? placeholder;

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-sm outline-none transition-colors",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring/50",
          !selectedOption && placeholder && "italic opacity-70",
          className,
        )}
      >
        <span>{displayLabel}</span>
        <ChevronDownIcon className="size-3.5 opacity-50" />
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          align="end"
          sideOffset={6}
          className={cn(
            "z-50 min-w-[10rem] overflow-hidden rounded-xl border bg-popover/95 p-1.5 text-popover-foreground shadow-lg backdrop-blur-sm",
            "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in",
            "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          )}
        >
          <SelectPrimitive.Viewport className="space-y-0.5">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-lg py-2 pr-9 pl-3 text-sm outline-none transition-colors",
                  "focus:bg-accent focus:text-accent-foreground",
                  "data-[state=checked]:font-medium",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                )}
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <span className="absolute right-3 flex size-4 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
