"use client";

import { useRef } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryIconButton } from "./library-icon-button";

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
        className="text-muted-foreground pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2"
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
        className="bg-background placeholder:text-muted-foreground focus-visible:border-foreground/30 h-9 w-full rounded-(--library-control) border px-10 text-sm transition-colors outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <span className="absolute inset-y-0 end-1.5 flex items-center">
          <LibraryIconButton
            tooltip="Clear search"
            onClick={() => {
              onValueChange("");
              inputRef.current?.focus();
            }}
            className="size-6"
          >
            <XIcon aria-hidden />
          </LibraryIconButton>
        </span>
      )}
    </div>
  );
}
