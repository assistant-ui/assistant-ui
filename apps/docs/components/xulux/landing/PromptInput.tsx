"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value?: string | undefined;
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string | undefined;
};

export function PromptInput({
  value: controlled,
  onValueChange,
  onSubmit,
  placeholder,
}: Props) {
  const [internal, setInternal] = useState("");
  const value = controlled ?? internal;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const setValue = (nextValue: string) => {
    if (onValueChange) onValueChange(nextValue);
    else setInternal(nextValue);
  };

  useEffect(() => {
    void value;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
  };

  return (
    <div className="aui-composer-root relative flex w-full flex-col">
      <div
        data-slot="aui_composer-shell"
        className={cn(
          "bg-background border-foreground/10 dark:bg-muted/30",
          "flex w-full flex-col gap-2 rounded-3xl border p-2",
          "transition-colors",
          "focus-within:border-foreground/20",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          className="aui-composer-input text-foreground placeholder:text-muted-foreground/80 relative max-h-32 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base outline-none"
        />
        <div className="aui-composer-action-wrapper relative flex items-center justify-between px-0.5 pb-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-7 rounded-full"
            aria-label="Attach file"
            disabled
          >
            <PlusIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            className="aui-composer-send size-7 rounded-full"
            onClick={handleSubmit}
            disabled={!value.trim()}
            aria-label="Send prompt"
          >
            <ArrowUpIcon className="size-4.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
