"use client";

import type { Unstable_InteractableToolRenderProps } from "@assistant-ui/react";
import { Check, Copy, RotateCcw, SquarePen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Note = { title: string; content: string };

export function Notepad({
  state,
  setState,
  version,
  streaming,
}: Unstable_InteractableToolRenderProps<Note>) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const historical = version && !version.isLatest;
  const note = historical ? version.state : state;

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || document.activeElement === body) return;
    if (body.innerText !== note.content) body.innerText = note.content;
  }, [note.content]);

  return (
    <section className="my-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40">
      <header className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <SquarePen className="size-4 text-[var(--muted-foreground)]" />
        <input
          aria-label="Note title"
          value={note.title}
          disabled={streaming || historical}
          onChange={(event) =>
            setState((current) => ({ ...current, title: event.target.value }))
          }
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
        />
        {version &&
          !historical &&
          (state.title !== version.state.title ||
            state.content !== version.state.content) && (
            <button
              aria-label="Restore saved version"
              onClick={version.restore}
              className="rounded-md p-2 hover:bg-[var(--background)]"
            >
              <RotateCcw className="size-4" />
            </button>
          )}
        <button
          aria-label="Copy note"
          onClick={() => {
            void navigator.clipboard?.writeText(note.content);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
          className="rounded-md p-2 hover:bg-[var(--background)]"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </header>
      <div
        ref={bodyRef}
        role="textbox"
        aria-label="Note text"
        aria-multiline="true"
        contentEditable={!streaming && !historical}
        suppressContentEditableWarning
        onInput={() =>
          setState((current) => ({
            ...current,
            content: bodyRef.current?.innerText ?? current.content,
          }))
        }
        className="min-h-36 p-4 leading-7 whitespace-pre-wrap outline-none"
      >
        {note.content}
      </div>
    </section>
  );
}
