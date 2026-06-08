import type { ReactNode } from "react";
import { Chip, JSONPreview, ToneBadge } from "../ui";
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
      {tone === "reasoning" ? (
        <ToneBadge tone="violet">{type}</ToneBadge>
      ) : (
        <Chip>{type}</Chip>
      )}
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
        ? "text-muted-foreground wrap-break-word whitespace-pre-wrap italic"
        : "text-foreground wrap-break-word whitespace-pre-wrap"
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
          <div className="text-foreground">
            {part.title ?? part.url ?? part.sourceType ?? "(source)"}
            {part.title && part.url ? (
              <span className="text-muted-foreground ml-1">({part.url})</span>
            ) : null}
          </div>
        </PartShell>
      );
    case "image":
      return (
        <PartShell type="image" status={part.status}>
          <div className="text-foreground">{part.filename ?? "(image)"}</div>
        </PartShell>
      );
    case "file":
      return (
        <PartShell type="file" status={part.status}>
          <div className="text-foreground">
            {part.filename ?? "(file)"}
            {part.mimeType ? (
              <span className="text-muted-foreground ml-1">
                {part.mimeType}
              </span>
            ) : null}
          </div>
        </PartShell>
      );
    case "audio":
      return (
        <PartShell type="audio" status={part.status}>
          <div className="text-foreground">{part.format ?? "(audio)"}</div>
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
