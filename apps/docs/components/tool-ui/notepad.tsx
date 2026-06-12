"use client";

import { cn } from "@/lib/utils";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { type InteractableToolRenderProps } from "@assistant-ui/react";
import {
  CheckIcon,
  CopyIcon,
  RotateCcwIcon,
  SquarePenIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";
import { z } from "zod";

// Mirrors the `notepad` tool's parameters schema in docs-toolkit.tsx (which
// can't import from this client module on the server).
const notepadStateSchema = z.object({
  title: z.string().describe("A short title for the text."),
  content: z.string().describe("The full plain text."),
});

export type NotepadArgs = z.infer<typeof notepadStateSchema>;

const NotepadCard: FC<{
  title: React.ReactNode;
  actions?: React.ReactNode;
  muted?: boolean;
  children: React.ReactNode;
}> = ({ title, actions, muted, children }) => (
  <div
    className={cn(
      "border-border/60 bg-muted/40 my-3 rounded-2xl border",
      muted && "opacity-75",
    )}
  >
    <div className="flex items-center gap-2.5 py-2.5 pr-3 pl-3.5">
      <SquarePenIcon className="text-muted-foreground size-4.5 shrink-0" />
      {title}
      <div className="ml-auto flex items-center gap-0.5">{actions}</div>
    </div>
    <div className="px-4 pt-0.5 pb-4 text-[15px] leading-7">{children}</div>
  </div>
);

const titleClass =
  "text-foreground focus:bg-accent min-w-0 max-w-full truncate rounded-md bg-transparent px-1 py-0.5 -mx-1 text-sm font-semibold outline-none";

const CopyButton: FC<{ content: string }> = ({ content }) => {
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const copy = () => {
    navigator.clipboard?.writeText(content).catch(() => {});
    setCopied(true);
    clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 1400);
  };

  return (
    <TooltipIconButton
      tooltip="Copy"
      className={cn(
        "text-muted-foreground hover:text-foreground size-8 rounded-md",
        copied && "text-green-600 hover:text-green-600",
      )}
      onClick={copy}
    >
      {copied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </TooltipIconButton>
  );
};

/**
 * Frozen-history notepad: the message with the most recent edit is the live,
 * editable note; older messages show their own version read-only.
 */
export const Notepad: FC<InteractableToolRenderProps<NotepadArgs>> = ({
  state,
  setState,
  version,
  streaming,
}) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const editable = !streaming && (!version || version.isLatest);
  const note = version && !version.isLatest ? version.state : state;

  // contentEditable is uncontrolled; mirror external (model) updates into the
  // DOM, but never while the user is typing in it.
  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;
    if (document.activeElement === node) return;
    if (node.innerText !== note.content) node.innerText = note.content;
  }, [note.content]);

  if (streaming) {
    return (
      <NotepadCard
        title={
          <span className={cn(titleClass, "animate-pulse")}>
            {note.title || "Drafting note..."}
          </span>
        }
      >
        <div className="wrap-break-word whitespace-pre-wrap">
          {note.content}
        </div>
      </NotepadCard>
    );
  }

  const edited =
    editable &&
    version !== undefined &&
    (state.title !== version.state.title ||
      state.content !== version.state.content);

  const revert = () => {
    version?.restore();
    if (bodyRef.current && version) {
      bodyRef.current.innerText = version.state.content;
    }
  };

  return (
    <NotepadCard
      muted={!editable}
      title={
        <input
          className={titleClass}
          value={note.title ?? ""}
          readOnly={!editable}
          spellCheck={false}
          aria-label="Note title"
          onChange={(e) =>
            setState((prev) => ({ ...prev, title: e.target.value }))
          }
        />
      }
      actions={
        <>
          {edited && (
            <>
              <span className="relative inline-flex">
                <TooltipIconButton
                  tooltip="Revert to original"
                  className="text-muted-foreground hover:text-foreground size-8 rounded-md"
                  onClick={revert}
                >
                  <RotateCcwIcon className="size-4" />
                </TooltipIconButton>
                <span
                  className="ring-muted/40 pointer-events-none absolute top-0.5 right-0.5 size-1.75 rounded-full bg-amber-500 ring-2"
                  aria-label="Edited"
                />
              </span>
              <div className="bg-border mx-1 h-4.5 w-px" />
            </>
          )}
          <CopyButton content={note.content} />
        </>
      }
    >
      {editable ? (
        <div
          ref={bodyRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          role="textbox"
          aria-multiline="true"
          aria-label="Note text"
          className="caret-foreground wrap-break-word whitespace-pre-wrap outline-none"
          onInput={() =>
            setState((prev) => ({
              ...prev,
              content: bodyRef.current?.innerText ?? prev.content,
            }))
          }
        />
      ) : (
        <div className="wrap-break-word whitespace-pre-wrap">
          {note.content}
        </div>
      )}
    </NotepadCard>
  );
};
