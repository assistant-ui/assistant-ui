import type { ReactNode } from "react";
import { JSONPreview } from "../ui";
import { StatusBadge } from "./StatusBadge";
import { ToolCallView } from "./ToolCallView";
import type { PartPreview, PartStatusPreview } from "./types";

const PartShell = ({
  type,
  status,
  children,
  tone,
}: {
  type: string;
  status?: PartStatusPreview | undefined;
  children?: ReactNode;
  tone?: "reasoning" | undefined;
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2">
      <span
        className={
          tone === "reasoning"
            ? "rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase dark:text-violet-300"
            : "rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-zinc-600 uppercase dark:bg-zinc-800 dark:text-zinc-300"
        }
      >
        {type}
      </span>
      {status ? (
        <StatusBadge type={status.type} reason={status.reason} />
      ) : null}
    </div>
    {children}
  </div>
);

const Text = ({ value, muted }: { value: string; muted?: boolean }) => (
  <div
    className={
      muted
        ? "wrap-break-word whitespace-pre-wrap text-zinc-500 italic dark:text-zinc-400"
        : "wrap-break-word whitespace-pre-wrap text-zinc-700 dark:text-zinc-200"
    }
  >
    {value || "(empty)"}
  </div>
);

export const PartView = ({ part }: { part: PartPreview }) => {
  switch (part.type) {
    case "tool-call":
      return <ToolCallView part={part} />;
    case "text":
      return (
        <PartShell type="text" status={part.status}>
          <Text value={part.text} />
        </PartShell>
      );
    case "reasoning":
      return (
        <PartShell type="reasoning" status={part.status} tone="reasoning">
          <Text value={part.text} muted />
        </PartShell>
      );
    case "source":
      return (
        <PartShell type="source" status={part.status}>
          <div className="text-zinc-600 dark:text-zinc-300">
            {part.title ?? part.url ?? part.sourceType ?? "(source)"}
            {part.url ? (
              <span className="ml-1 text-zinc-400">({part.url})</span>
            ) : null}
          </div>
        </PartShell>
      );
    case "image":
      return (
        <PartShell type="image" status={part.status}>
          <div className="text-zinc-600 dark:text-zinc-300">
            {part.filename ?? "(image)"}
          </div>
        </PartShell>
      );
    case "file":
      return (
        <PartShell type="file" status={part.status}>
          <div className="text-zinc-600 dark:text-zinc-300">
            {part.filename ?? "(file)"}
            {part.mimeType ? (
              <span className="ml-1 text-zinc-400">{part.mimeType}</span>
            ) : null}
          </div>
        </PartShell>
      );
    case "audio":
      return (
        <PartShell type="audio" status={part.status}>
          <div className="text-zinc-600 dark:text-zinc-300">
            {part.format ?? "(audio)"}
          </div>
        </PartShell>
      );
    case "data":
      return (
        <PartShell
          type={part.name ? `data: ${part.name}` : "data"}
          status={part.status}
        >
          <JSONPreview value={part.data} />
        </PartShell>
      );
    case "generative-ui":
      return (
        <PartShell type="generative-ui" status={part.status}>
          <JSONPreview value={part.spec} />
        </PartShell>
      );
    default:
      return (
        <PartShell type={part.rawType || "unknown"} status={part.status}>
          <JSONPreview value={part.raw} />
        </PartShell>
      );
  }
};
