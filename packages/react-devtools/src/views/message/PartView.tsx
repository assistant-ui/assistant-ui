import type { ReactNode } from "react";
import {
  AudioPartView,
  FilePartView,
  ImagePartView,
} from "../attachments/MediaPartView";
import { Chip, JSONTree, ToneBadge } from "../ui";
import { StatusBadge } from "./StatusBadge";
import { ToolCallView } from "./ToolCallView";
import type { PartPreview, PartStatusPreview } from "./types";

const PartShell = ({
  type,
  status,
  children,
  tone,
  compact = false,
}: {
  type: string;
  status?: PartStatusPreview | undefined;
  children?: ReactNode;
  tone?: "reasoning" | undefined;
  compact?: boolean;
}) => {
  if (compact) {
    return (
      <div className="px-2 py-1.5">
        {children}
        {status ? (
          <div className="mt-1">
            <StatusBadge
              type={status.type}
              reason={status.reason}
              compact
              size="sm"
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
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
};

const Text = ({
  value,
  muted,
  compact = false,
}: {
  value: string;
  muted?: boolean;
  compact?: boolean;
}) => (
  <div
    className={
      muted
        ? compact
          ? "text-muted-foreground text-[11px] wrap-break-word whitespace-pre-wrap italic"
          : "text-muted-foreground wrap-break-word whitespace-pre-wrap italic"
        : compact
          ? "text-foreground text-[11px] wrap-break-word whitespace-pre-wrap"
          : "text-foreground wrap-break-word whitespace-pre-wrap"
    }
  >
    {value || "(empty)"}
  </div>
);

export const PartView = ({
  part,
  compact = false,
}: {
  part: PartPreview;
  compact?: boolean;
}) => {
  switch (part.type) {
    case "tool-call":
      return <ToolCallView part={part} nested={compact} />;
    case "text":
      return (
        <PartShell type="text" status={part.status} compact={compact}>
          <Text value={part.text} compact={compact} />
        </PartShell>
      );
    case "reasoning":
      return (
        <PartShell
          type="reasoning"
          status={part.status}
          tone="reasoning"
          compact={compact}
        >
          <Text value={part.text} muted compact={compact} />
        </PartShell>
      );
    case "source":
      return (
        <PartShell type="source" status={part.status} compact={compact}>
          <div className="text-foreground text-[11px]">
            {part.title ?? part.url ?? part.sourceType ?? "(source)"}
            {part.title && part.url ? (
              <span className="text-muted-foreground ml-1">({part.url})</span>
            ) : null}
          </div>
        </PartShell>
      );
    case "image":
      return (
        <div className="flex flex-col gap-1">
          <ImagePartView part={part} compact={compact} />
          {part.status ? (
            <div className={compact ? "px-2" : undefined}>
              <StatusBadge
                type={part.status.type}
                reason={part.status.reason}
                compact
                size="sm"
              />
            </div>
          ) : null}
        </div>
      );
    case "file":
      return (
        <div className="flex flex-col gap-1">
          <FilePartView part={part} compact={compact} />
          {part.status ? (
            <div className={compact ? "px-2" : undefined}>
              <StatusBadge
                type={part.status.type}
                reason={part.status.reason}
                compact
                size="sm"
              />
            </div>
          ) : null}
        </div>
      );
    case "audio":
      return (
        <div className="flex flex-col gap-1">
          <AudioPartView part={part} compact={compact} />
          {part.status ? (
            <div className={compact ? "px-2" : undefined}>
              <StatusBadge
                type={part.status.type}
                reason={part.status.reason}
                compact
                size="sm"
              />
            </div>
          ) : null}
        </div>
      );
    case "data":
      return (
        <PartShell
          type={part.name ? `data: ${part.name}` : "data"}
          status={part.status}
          compact={compact}
        >
          <JSONTree value={part.data} openDepth={compact ? 0 : 1} />
        </PartShell>
      );
    case "generative-ui":
      return (
        <PartShell type="generative-ui" status={part.status} compact={compact}>
          <JSONTree value={part.spec} openDepth={compact ? 0 : 1} />
        </PartShell>
      );
    default:
      return (
        <PartShell
          type={part.rawType || "unknown"}
          status={part.status}
          compact={compact}
        >
          <JSONTree value={part.raw} openDepth={compact ? 0 : 1} />
        </PartShell>
      );
  }
};
