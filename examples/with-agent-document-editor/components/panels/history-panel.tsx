"use client";

import {
  unstable_useInteractableVersions,
  useAuiState,
} from "@assistant-ui/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DiffViewer } from "@/components/ui/diff-viewer";
import { useDocumentState, useWorkspace } from "@/components/workspace-context";
import { blockToMarkdown } from "@/lib/blocks";
import {
  countChanges,
  DOCUMENT_ID,
  DOCUMENT_NAME,
  type DocumentState,
} from "@/lib/document-state";
import { cn } from "@/lib/utils";

type Change = { id: string; before: string; after: string };

function changedBlocks(before: DocumentState, after: DocumentState): Change[] {
  const changes: Change[] = [];
  if (before.title !== after.title) {
    changes.push({
      id: "title",
      before: `Title: ${before.title ?? ""}`,
      after: `Title: ${after.title ?? ""}`,
    });
  }
  const previous = new Map(before.blocks.map((block) => [block.id, block]));
  const next = new Set(after.blocks.map((block) => block.id));
  for (const block of after.blocks) {
    const old = previous.get(block.id);
    const was = old ? blockToMarkdown(old) : "";
    const now = blockToMarkdown(block);
    if (was !== now) changes.push({ id: block.id, before: was, after: now });
  }
  for (const block of before.blocks) {
    if (next.has(block.id)) continue;
    changes.push({ id: block.id, before: blockToMarkdown(block), after: "" });
  }
  return changes;
}

function summarize(before: DocumentState | undefined, after: DocumentState) {
  if (!before) return "Where this chat started";
  const { edited, added, removed, renamed } = countChanges(before, after);
  const parts = [
    edited && `${edited} edited`,
    added && `${added} added`,
    removed && `${removed} removed`,
    renamed && "renamed",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "Blocks reordered";
}

export function HistoryPanel() {
  const { focusedVersion, showVersion } = useWorkspace();
  const [live] = useDocumentState();
  const versions = unstable_useInteractableVersions<DocumentState>(
    DOCUMENT_ID,
    DOCUMENT_NAME,
  );
  const [selected, setSelected] = useState<number | null>(null);
  const isRunning = useAuiState((s) => s.thread.isRunning);

  const focused = focusedVersion
    ? versions.findIndex((version) => version.toolCallId === focusedVersion)
    : -1;
  const open = focused !== -1 ? focused : selected;

  const liveText = JSON.stringify(live);
  const currentIndex = versions.findLastIndex(
    (version) => JSON.stringify(version.state) === liveText,
  );

  if (versions.length === 0) {
    return (
      <p className="text-muted-foreground p-4 text-sm leading-relaxed">
        Nothing recorded yet. A version is saved each time you send a message
        and each time the assistant edits the document.
      </p>
    );
  }

  return (
    <ol reversed className="flex flex-col gap-1 p-2">
      {currentIndex === -1 && (
        <li className="text-muted-foreground px-3 py-2 text-sm">
          You have edits that are not in a version yet. They are recorded with
          your next message.
        </li>
      )}
      {versions
        .map((version, index) => ({ version, index }))
        .reverse()
        .map(({ version, index }) => {
          const before = versions[index - 1]?.state;
          const isOpen = open === index;
          const isCurrent = index === currentIndex;
          return (
            <li
              key={index}
              className={cn(
                "flex flex-col rounded-xl transition-colors",
                isOpen ? "bg-foreground/[0.05]" : "hover:bg-foreground/[0.025]",
              )}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                  showVersion(null);
                  setSelected(isOpen ? null : index);
                }}
                className="focus-visible:ring-ring/50 flex items-center gap-2.5 rounded-xl p-3 text-start outline-none focus-visible:ring-1"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    isCurrent ? "bg-blue-500" : "bg-foreground/25",
                  )}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm">
                    Version {index + 1}
                    <span className="text-muted-foreground">
                      {" · "}
                      {version.origin === "user-edit" ? "You" : "Assistant"}
                    </span>
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {summarize(before, version.state)}
                  </span>
                </span>
                {isCurrent && (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    Current
                  </span>
                )}
              </button>
              {isOpen && (
                <div className="flex flex-col gap-2 px-3 pb-3">
                  {before &&
                    changedBlocks(before, version.state).length === 0 && (
                      <p className="text-muted-foreground text-sm">
                        The same blocks, in a different order.
                      </p>
                    )}
                  {before && (
                    <div className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
                      {changedBlocks(before, version.state).map((change) => (
                        <DiffViewer
                          key={change.id}
                          oldFile={{ content: change.before }}
                          newFile={{ content: change.after }}
                          showLineNumbers={false}
                          showStats={false}
                          copyable={false}
                          size="sm"
                          className="shrink-0 rounded-lg font-sans [&_[data-slot=diff-viewer-content]]:[word-break:normal]"
                        />
                      ))}
                    </div>
                  )}
                  {!isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      // An edit still streaming would merge into the restored text.
                      disabled={isRunning}
                      onClick={() => version.restore()}
                    >
                      Restore this version
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
    </ol>
  );
}
