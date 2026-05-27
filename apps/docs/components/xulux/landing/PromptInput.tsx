"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
  };

  return (
    <div className="border-border bg-card/40 focus-within:border-border/80 w-full rounded-2xl border p-3 backdrop-blur transition-colors">
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
        className="text-foreground placeholder:text-muted-foreground w-full resize-none bg-transparent px-2 py-2 text-base focus:outline-none"
      />
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground rounded-lg"
          aria-label="Attach file"
        >
          <Plus className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          className="rounded-lg"
          onClick={handleSubmit}
          disabled={!value.trim()}
          aria-label="Send prompt"
        >
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
