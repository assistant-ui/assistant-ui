import { useState, useRef, useEffect } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/agent-playground/ui/button";

type Props = {
  value?: string | undefined;
  onValueChange?: (v: string) => void | undefined;
  onSubmit?: (v: string) => void | undefined;
  placeholder?: string | undefined;
};

export function PromptInput({ value: controlled, onValueChange, onSubmit, placeholder }: Props) {
  const [internal, setInternal] = useState("");
  const value = controlled ?? internal;
  const setValue = (v: string) => {
    if (onValueChange) onValueChange(v);
    else setInternal(v);
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
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
    <div className="w-full rounded-2xl border border-border bg-card/40 backdrop-blur p-3 focus-within:border-border/80 transition-colors">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={placeholder}
        rows={1}
        className="w-full resize-none bg-transparent px-2 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Attach file"
        >
          <Plus className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          className="size-8 rounded-lg"
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
