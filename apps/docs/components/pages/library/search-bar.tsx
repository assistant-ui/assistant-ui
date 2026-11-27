"use client";

import { useRef } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({
  value,
  onValueChange,
  label,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", className)}>
      <SearchIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2"
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            event.stopPropagation();
            onValueChange("");
          }
        }}
        placeholder={label}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        className="bg-background placeholder:text-muted-foreground focus-visible:border-foreground/30 h-11 w-full rounded-full border px-11 text-[15px] transition-colors outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onValueChange("");
            inputRef.current?.focus();
          }}
          className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] absolute end-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full transition-colors"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
