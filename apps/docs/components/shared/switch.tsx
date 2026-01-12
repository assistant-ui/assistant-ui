"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300",
        checked
          ? "bg-foreground shadow-[inset_0_1px_3px_rgba(0,0,0,0.2),inset_0_-1px_1px_rgba(255,255,255,0.1)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),inset_0_-1px_1px_rgba(255,255,255,0.05)]"
          : "bg-muted shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-3 rounded-full transition-all duration-300",
          checked
            ? "translate-x-5 bg-background shadow-[0_1px_3px_rgba(0,0,0,0.3),0_0_1px_rgba(0,0,0,0.1)] dark:bg-zinc-800 dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)]"
            : "translate-x-1 bg-background shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.1)] dark:bg-zinc-500 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.3)]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
