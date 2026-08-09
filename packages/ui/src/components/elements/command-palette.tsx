"use client";

import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, floating, mono } from "./surfaces";

export interface PaletteCommand {
  id: string;
  label: string;
  group: string;
  keys: readonly string[];
}

export function CommandPalette({
  commands,
  query,
  activeId,
  onQueryChange,
  onRun,
  className,
}: {
  commands: readonly PaletteCommand[];
  query: string;
  activeId: string;
  onQueryChange?: (query: string) => void;
  onRun?: (id: string) => void;
  className?: string;
}) {
  const matches = commands.filter((command) =>
    command.label.toLowerCase().includes(query.toLowerCase()),
  );
  const groups = [...new Set(matches.map((command) => command.group))];

  return (
    <div
      className={cn(
        floating,
        "flex w-full max-w-sm flex-col overflow-hidden rounded-[20px]",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <SearchIcon className="text-foreground/30 size-3.5 shrink-0" />
        <input
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          placeholder="Type a command"
          aria-label="Type a command"
          className="text-foreground/85 placeholder:text-foreground/30 min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
        />
        <span
          className={cn(
            field,
            mono,
            "text-foreground/35 rounded px-1.5 py-0.5",
          )}
        >
          esc
        </span>
      </div>

      <div className="border-foreground/[0.07] flex max-h-72 flex-col overflow-y-auto border-t p-1.5">
        {groups.map((group) => (
          <div key={group} className="flex flex-col">
            <span className={cn(mono, "text-foreground/25 px-2 pt-2 pb-1")}>
              {group}
            </span>
            {matches
              .filter((command) => command.group === group)
              .map((command) => (
                <button
                  key={command.id}
                  type="button"
                  onClick={() => onRun?.(command.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-2 py-1.5 text-start transition-colors",
                    command.id === activeId
                      ? "bg-foreground/[0.06]"
                      : "hover:bg-foreground/[0.03]",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    {command.label}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {command.keys.map((key) => (
                      <span
                        key={key}
                        className={cn(
                          field,
                          mono,
                          "text-foreground/40 rounded px-1.5 py-0.5",
                        )}
                      >
                        {key}
                      </span>
                    ))}
                  </span>
                </button>
              ))}
          </div>
        ))}
        {matches.length === 0 && (
          <span className="text-foreground/30 px-2 py-4 text-center text-xs">
            No command matches “{query}”
          </span>
        )}
      </div>
    </div>
  );
}
