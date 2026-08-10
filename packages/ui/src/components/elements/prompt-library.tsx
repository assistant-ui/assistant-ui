"use client";

import type { ComponentProps } from "react";
import { BookmarkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export interface SavedPrompt {
  id: string;
  name: string;
  body: string;
  variables: readonly string[];
}

export function PromptLibrary({
  prompts,
  query,
  selectedId,
  onQueryChange,
  onSelect,
  onInsert,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  | "children"
  | "prompts"
  | "query"
  | "selectedId"
  | "onQueryChange"
  | "onSelect"
  | "onInsert"
> & {
  prompts: readonly SavedPrompt[];
  query: string;
  selectedId: string;
  onQueryChange?: (query: string) => void;
  onSelect?: (id: string) => void;
  onInsert?: (id: string) => void;
}) {
  const matches = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = matches.find((prompt) => prompt.id === selectedId);

  const move = (delta: number) => {
    if (matches.length === 0) return;
    const at = matches.findIndex((prompt) => prompt.id === selectedId);
    // selectedId can be filtered out by the query; start from the edge the key implies
    const from = at === -1 ? (delta > 0 ? -1 : 0) : at;
    const next = matches[(from + delta + matches.length) % matches.length];
    if (next) onSelect?.(next.id);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter" && selected) {
      event.preventDefault();
      onInsert?.(selected.id);
    }
  };

  return (
    <div
      data-slot="prompt-library"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-2 rounded-2xl p-3",
        className,
      )}

      {...props}
    >
      <div
        className={cn(
          field,
          "flex items-center gap-2 rounded-xl px-2.5 py-1.5",
        )}
      >
        <BookmarkIcon className="text-foreground/30 size-3.5 shrink-0" />
        <input
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search prompts"
          aria-label="Search saved prompts"
          className="text-foreground/85 placeholder:text-foreground/30 min-w-0 flex-1 bg-transparent text-[13px] outline-none"
        />
      </div>

      <div className="flex flex-col">
        {matches.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => onSelect?.(prompt.id)}
            onDoubleClick={() => onInsert?.(prompt.id)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              onInsert?.(prompt.id);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl px-2 py-1.5 text-start transition-colors",
              prompt.id === selectedId
                ? "bg-foreground/[0.05]"
                : "hover:bg-foreground/[0.03]",
            )}
          >
            <span className="min-w-0 flex-1 truncate text-[13px]">
              {prompt.name}
            </span>
            {prompt.variables.length > 0 && (
              <span className={cn(mono, "text-foreground/25 shrink-0")}>
                {prompt.variables.length} vars
              </span>
            )}
          </button>
        ))}
        {matches.length === 0 && (
          <span className="text-foreground/30 px-2 py-3 text-center text-xs break-words">
            Nothing matches “{query}”
          </span>
        )}
      </div>

      {selected && (
        <div
          className={cn(
            field,
            "fade-in animate-in flex flex-col gap-2 rounded-xl p-2.5 duration-200",
          )}
        >
          <p className="text-foreground/65 text-xs leading-relaxed break-words">
            {selected.body}
          </p>
          {selected.variables.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selected.variables.map((variable) => (
                <span
                  key={variable}
                  className={cn(
                    mono,
                    "bg-background/70 text-foreground/50 rounded px-1.5 py-0.5",
                  )}
                >
                  {`{${variable}}`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
