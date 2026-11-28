"use client";

import { useRef } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryIconButton } from "./library-icon-button";

export function SearchBar({
  value,
  onValueChange,
  label,
  count,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  /** How many items are listed, shown at the end of the field. */
  count?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        "bg-background focus-within:border-foreground/30 flex h-9 items-center gap-2 rounded-(--library-control) border ps-3.5 pe-1.5 transition-colors",
        className,
      )}
    >
      <SearchIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none size-4 shrink-0"
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
        className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {count ? (
        <span
          aria-hidden
          className="text-muted-foreground shrink-0 text-xs whitespace-nowrap tabular-nums last:pe-2"
        >
          {count}
        </span>
      ) : null}
      {value && (
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
      )}
    </div>
  );
}
