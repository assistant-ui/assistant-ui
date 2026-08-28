"use client";

import { useRef } from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function FilterInput({
  value,
  onValueChange,
  onEnter,
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "onKeyDown"
> & {
  value: string;
  onValueChange: (value: string) => void;
  onEnter?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onEnter?.();
          }
          if (event.key === "Escape" && value) {
            event.preventDefault();
            event.stopPropagation();
            onValueChange("");
          }
        }}
        className="h-8 px-2.5 pe-7 text-[13px] md:text-[13px] [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear filter"
          onClick={() => {
            onValueChange("");
            inputRef.current?.focus();
          }}
          className="text-muted-foreground hover:text-foreground absolute end-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-(--radius-sm) transition-colors"
        >
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}
