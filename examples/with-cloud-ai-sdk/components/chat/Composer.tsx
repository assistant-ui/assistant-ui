"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, Square } from "lucide-react";

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isRunning: boolean;
  onCancel?: () => void;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  isRunning,
  onCancel,
}: ComposerProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isRunning) {
      onSubmit();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isRunning) {
        onSubmit();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t bg-background p-4">
      <div className="flex items-end gap-2 rounded-2xl border bg-background p-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          rows={1}
          autoFocus
        />
        {isRunning ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex size-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
            aria-label="Stop generating"
          >
            <Square className="size-3 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-colors",
              value.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground",
            )}
            aria-label="Send message"
          >
            <ArrowUp className="size-4" />
          </button>
        )}
      </div>
    </form>
  );
}
