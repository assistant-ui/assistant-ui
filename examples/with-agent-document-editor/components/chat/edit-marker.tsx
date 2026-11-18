"use client";

import {
  unstable_useInteractableVersions,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import { MessageSquareIcon, PencilLineIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useDocumentState, useWorkspace } from "@/components/workspace-context";
import {
  countChanges,
  DOCUMENT_ID,
  DOCUMENT_NAME,
  type DocumentState,
} from "@/lib/document-state";
import { cn } from "@/lib/utils";

const count = (value: unknown) => (Array.isArray(value) ? value.length : 0);

const plural = (amount: number, noun: string) =>
  `${amount} ${noun}${amount === 1 ? "" : "s"}`;

const operations = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

function describeDocumentEdit(before: DocumentState, after: DocumentState) {
  const { edited, added, removed, renamed } = countChanges(before, after);
  const parts = [
    edited && `edited ${plural(edited, "block")}`,
    added && `added ${plural(added, "block")}`,
    removed && `removed ${plural(removed, "block")}`,
    renamed && "renamed the document",
  ].filter((part): part is string => !!part);
  const summary = parts.length ? parts.join(", ") : "reordered the blocks";
  return summary[0]!.toUpperCase() + summary.slice(1);
}

function describeCommentsEdit(args: Record<string, unknown>) {
  const comments = operations(args.comments);
  const resolved = Array.isArray(comments.update)
    ? comments.update.filter((item) => operations(item).resolved === true)
        .length
    : 0;
  const parts: string[] = [];
  if (count(comments.add)) {
    parts.push(`Added ${plural(count(comments.add), "comment")}`);
  }
  if (resolved) parts.push(`Resolved ${plural(resolved, "comment")}`);
  return parts.length ? parts.join(", ") : "Updated the comments";
}

const failed = (result: unknown) =>
  !!result &&
  typeof result === "object" &&
  (result as { success?: unknown }).success === false;

function Marker({
  icon,
  label,
  running = false,
  children,
}: {
  icon: ReactNode;
  label: string;
  running?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      aria-busy={running}
      className="text-muted-foreground my-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
    >
      <span className="flex items-center gap-1.5 [&_svg]:size-3.5 [&_svg]:shrink-0">
        {icon}
        <span
          className={cn(running && "animate-pulse motion-reduce:animate-none")}
        >
          {label}
        </span>
      </span>
      {!running && children}
    </div>
  );
}

const linkButton =
  "text-foreground decoration-foreground/30 hover:decoration-foreground rounded-sm underline underline-offset-4 outline-none focus-visible:ring-1 focus-visible:ring-ring/50";

export const DocumentEditMarker: ToolCallMessagePartComponent = ({
  toolCallId,
  status,
  result,
}) => {
  const { showVersion } = useWorkspace();
  const [live] = useDocumentState();
  const versions = unstable_useInteractableVersions<DocumentState>(
    DOCUMENT_ID,
    DOCUMENT_NAME,
  );
  const index = versions.findIndex(
    (version) => version.toolCallId === toolCallId,
  );
  const version = versions[index];
  const previous = versions[index - 1];
  const running = status.type === "running";

  if (failed(result)) {
    return <Marker icon={<PencilLineIcon />} label="The edit did not apply" />;
  }

  const isLatest = index !== -1 && index === versions.length - 1;
  const undone =
    !!previous && JSON.stringify(live) === JSON.stringify(previous.state);

  return (
    <Marker
      icon={<PencilLineIcon />}
      label={
        running
          ? "Editing the document"
          : status.type === "incomplete"
            ? "The edit was cut short"
            : version && previous
              ? describeDocumentEdit(previous.state, version.state)
              : "Edited the document"
      }
      running={running}
    >
      {version && (
        <button
          type="button"
          className={linkButton}
          onClick={() => showVersion(toolCallId)}
        >
          View changes
        </button>
      )}
      {version && isLatest && previous && (
        <button
          type="button"
          className={linkButton}
          onClick={() => (undone ? version.restore() : previous.restore())}
        >
          {undone ? "Redo" : "Undo"}
        </button>
      )}
    </Marker>
  );
};

export const CommentsEditMarker: ToolCallMessagePartComponent = ({
  args,
  status,
  result,
}) => {
  const { setPanel } = useWorkspace();
  const running = status.type === "running";

  if (failed(result)) {
    return (
      <Marker icon={<MessageSquareIcon />} label="The comment did not save" />
    );
  }
  if (status.type === "incomplete") {
    return (
      <Marker
        icon={<MessageSquareIcon />}
        label="The comments were cut short"
      />
    );
  }

  return (
    <Marker
      icon={<MessageSquareIcon />}
      label={running ? "Writing comments" : describeCommentsEdit(args)}
      running={running}
    >
      <button
        type="button"
        className={linkButton}
        onClick={() => setPanel("comments")}
      >
        Show comments
      </button>
    </Marker>
  );
};
