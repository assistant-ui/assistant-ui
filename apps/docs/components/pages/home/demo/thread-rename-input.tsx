"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export function ThreadRenameInput({
  title,
  onRename,
  onDone,
}: {
  title: string;
  onRename: (title: string) => void | Promise<void>;
  onDone: (restoreFocus: boolean) => void;
}) {
  const [value, setValue] = useState(title);
  const initialTitleRef = useRef(title);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const settledRef = useRef(false);
  const errorId = useId();

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const commit = async (restoreFocus: boolean) => {
    if (settledRef.current) return;
    const next = value.trim();
    if (!next || next === title || next === initialTitleRef.current.trim()) {
      settledRef.current = true;
      onDone(restoreFocus);
      return;
    }
    settledRef.current = true;
    setPending(true);
    setError(false);
    try {
      await onRename(next);
      if (inputRef.current) onDone(restoreFocus);
    } catch {
      settledRef.current = false;
      setPending(false);
      setError(true);
      if (restoreFocus) inputRef.current?.focus();
    }
  };

  const cancel = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    onDone(true);
  };

  return (
    <form
      className="min-w-0 flex-1"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        void commit(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          void commit(false);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing || event.keyCode === 229) {
          if (event.key === "Enter") event.preventDefault();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
    >
      <div className="border-foreground/20 bg-background focus-within:border-foreground/40 rounded-control flex h-8 items-center border shadow-xs">
        <Input
          ref={inputRef}
          autoFocus
          aria-label="Rename thread"
          aria-invalid={error || undefined}
          aria-describedby={error ? errorId : undefined}
          readOnly={pending}
          value={value}
          className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 text-[13px] shadow-none focus-visible:ring-0 md:text-[13px]"
          onChange={(event) => {
            setValue(event.target.value);
            setError(false);
          }}
        />
        {pending ? (
          <span role="status" className="text-muted-foreground px-2 text-xs">
            Saving…
          </span>
        ) : (
          <>
            <button
              type="submit"
              onMouseDown={(event) => event.preventDefault()}
              aria-label="Save thread name"
              title="Save (Enter)"
              className="text-muted-foreground hover:text-foreground focus-visible:bg-muted grid size-7 shrink-0 place-items-center rounded-sm outline-none"
            >
              <CheckIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={cancel}
              aria-label="Cancel rename"
              title="Cancel (Esc)"
              className="text-muted-foreground hover:text-foreground focus-visible:bg-muted mr-0.5 grid size-7 shrink-0 place-items-center rounded-sm outline-none"
            >
              <XIcon className="size-3.5" />
            </button>
          </>
        )}
      </div>
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-destructive px-2 py-1 text-xs"
        >
          Could not rename. Try again.
        </p>
      ) : null}
    </form>
  );
}
