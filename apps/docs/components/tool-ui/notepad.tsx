"use client";

import { cn } from "@/lib/utils";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { type Unstable_InteractableToolRenderProps as InteractableToolRenderProps } from "@assistant-ui/react";
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
  title: z
    .string()
    .describe("A short title, shown as the heading of the notepad card."),
  content: z
    .string()
    .describe(
      "The full plain text, shown to the user in the body of the notepad card.",
    ),
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

type NotepadVersion = NonNullable<
  InteractableToolRenderProps<NotepadArgs>["version"]
>;

type UpdateNote = (updater: (prev: NotepadArgs) => NotepadArgs) => void;

const sameNote = (a: NotepadArgs, b: NotepadArgs) =>
  a.title === b.title && a.content === b.content;

const StreamingNotepad: FC<{ state: NotepadArgs }> = ({ state }) => (
  <NotepadCard
    title={
      <span className={cn(titleClass, "animate-pulse")}>
        {state.title || "Drafting note..."}
      </span>
    }
  >
    <div className="wrap-break-word whitespace-pre-wrap">{state.content}</div>
  </NotepadCard>
);

const NotepadEditor: FC<{
  note: NotepadArgs;
  setNote: UpdateNote;
  onRestore?: () => void;
}> = ({ note, setNote, onRestore }) => {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;
    if (document.activeElement === node) return;
    if (node.innerText !== note.content) node.innerText = note.content;
  }, [note.content]);

  return (
    <NotepadCard
      title={
        <input
          className={titleClass}
          value={note.title ?? ""}
          spellCheck={false}
          aria-label="Note title"
          onChange={(e) =>
            setNote((prev) => ({ ...prev, title: e.target.value }))
          }
        />
      }
      actions={
        <>
          {onRestore && (
            <>
              <span className="relative inline-flex">
                <TooltipIconButton
                  tooltip="Restore this version"
                  className="text-muted-foreground hover:text-foreground size-8 rounded-md"
                  onClick={onRestore}
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
          setNote((prev) => ({
            ...prev,
            content: bodyRef.current?.innerText ?? prev.content,
          }))
        }
      />
    </NotepadCard>
  );
};

const HistoricalNotepad: FC<{ version: NotepadVersion }> = ({ version }) => {
  const [note, setNote] = useState(version.state);
  const canRestore = !sameNote(note, version.state);

  return (
    <NotepadEditor
      note={note}
      setNote={(updater) => setNote(updater)}
      {...(canRestore ? { onRestore: () => setNote(version.state) } : {})}
    />
  );
};

const LiveNotepad: FC<{
  state: NotepadArgs;
  setState: InteractableToolRenderProps<NotepadArgs>["setState"];
  version: InteractableToolRenderProps<NotepadArgs>["version"];
}> = ({ state, setState, version }) => {
  const canRestore = version && !sameNote(state, version.state);

  return (
    <NotepadEditor
      note={state}
      setNote={(updater) => setState(updater)}
      {...(canRestore ? { onRestore: version.restore } : {})}
    />
  );
};

export const Notepad: FC<InteractableToolRenderProps<NotepadArgs>> = ({
  state,
  setState,
  version,
  streaming,
}) => {
  if (streaming) return <StreamingNotepad state={state} />;
  if (version && !version.isLatest)
    return <HistoricalNotepad version={version} />;
  return <LiveNotepad state={state} setState={setState} version={version} />;
};
