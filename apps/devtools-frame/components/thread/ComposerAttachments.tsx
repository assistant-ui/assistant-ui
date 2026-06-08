import { Chip, SectionLabel, ToneBadge } from "../ui";
import type { BadgeTone } from "../ui";
import type { AttachmentPreview, AttachmentStatusPreview } from "./types";

const STATUS_TONE: Record<string, BadgeTone> = {
  running: "blue",
  "requires-action": "amber",
  incomplete: "red",
  complete: "emerald",
};

const statusLabel = (status: AttachmentStatusPreview) => {
  if (status.type === "running" && typeof status.progress === "number") {
    const pct = status.progress <= 1 ? status.progress * 100 : status.progress;
    return `${status.reason ?? "running"} ${Math.round(pct)}%`;
  }
  return status.reason ? `${status.type} · ${status.reason}` : status.type;
};

const StatusBadge = ({ status }: { status: AttachmentStatusPreview }) => (
  <ToneBadge tone={STATUS_TONE[status.type]}>{statusLabel(status)}</ToneBadge>
);

export const ComposerAttachments = ({
  attachments,
}: {
  attachments: readonly AttachmentPreview[];
}) => {
  if (!attachments.length) return null;

  return (
    <div className="bg-card overflow-hidden rounded-md border">
      <div className="bg-muted border-b px-3 py-2">
        <SectionLabel>Attachments ({attachments.length})</SectionLabel>
      </div>
      <div className="divide-border divide-y">
        {attachments.map((attachment, index) => (
          <div
            key={attachment.id ?? index}
            className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-[11px]"
          >
            <span className="text-foreground font-medium">
              {attachment.name}
            </span>
            {attachment.kind ? <Chip>{attachment.kind}</Chip> : null}
            {attachment.contentType ? (
              <span className="text-muted-foreground text-[10px]">
                {attachment.contentType}
              </span>
            ) : null}
            {attachment.status ? (
              <StatusBadge status={attachment.status} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};
