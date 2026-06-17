import clsx from "clsx";
import { CopyButton, STATUS_TONE, ToneBadge } from "../ui";
import { formatBytes } from "./formatBytes";
import type { AttachmentPreview, AttachmentStatusPreview } from "./types";

const statusLabel = (status: AttachmentStatusPreview) => {
  if (status.type === "running" && typeof status.progress === "number") {
    const pct = status.progress <= 1 ? status.progress * 100 : status.progress;
    return `${status.reason ?? "uploading"} ${Math.round(pct)}%`;
  }
  return status.reason ? `${status.type} · ${status.reason}` : status.type;
};

const kindIcon = (attachment: AttachmentPreview) => {
  const kind = attachment.kind ?? attachment.contentType ?? "";
  if (kind.includes("image") || attachment.previewUrl) return "img";
  if (kind.includes("audio")) return "aud";
  if (kind.includes("pdf") || kind === "document") return "doc";
  return "file";
};

const AttachmentRow = ({ attachment }: { attachment: AttachmentPreview }) => {
  const size = formatBytes(attachment.sizeBytes);
  const meta = [attachment.kind, attachment.contentType, size]
    .filter(Boolean)
    .join(" · ");

  return (
    <details className="group border-border/60 border-b last:border-b-0">
      <summary className="hover:bg-accent/40 flex cursor-pointer list-none items-center gap-1.5 px-2 py-1 text-[11px] select-none">
        <span className="text-muted-foreground inline-block shrink-0 transition-transform group-open:rotate-90">
          ›
        </span>
        <ToneBadge tone="zinc" size="sm">
          {kindIcon(attachment)}
        </ToneBadge>
        <span className="text-foreground min-w-0 flex-1 truncate font-medium">
          {attachment.name}
        </span>
        {meta ? (
          <span className="text-muted-foreground hidden max-w-[45%] truncate text-[10px] sm:inline">
            {meta}
          </span>
        ) : null}
        {attachment.status ? (
          <ToneBadge
            tone={STATUS_TONE[attachment.status.type] ?? "zinc"}
            size="sm"
          >
            {statusLabel(attachment.status)}
          </ToneBadge>
        ) : null}
      </summary>
      <div className="flex flex-col gap-1 px-2 ps-6 pb-1.5">
        {attachment.previewUrl ? (
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="border-border max-h-24 max-w-full rounded border object-contain"
          />
        ) : null}
        <div className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]">
          {attachment.id ? (
            <span className="font-mono">id: {attachment.id}</span>
          ) : null}
          {attachment.kind ? <span>kind: {attachment.kind}</span> : null}
          {attachment.contentType ? (
            <span>type: {attachment.contentType}</span>
          ) : null}
          {size ? <span>{size}</span> : null}
        </div>
        {attachment.previewUrl ? (
          <div className="flex justify-end">
            <CopyButton
              value={attachment.previewUrl}
              label="Copy URL"
              iconOnly
              size="sm"
            />
          </div>
        ) : null}
      </div>
    </details>
  );
};

export const AttachmentList = ({
  attachments,
  label = "Attachments",
  bordered = true,
}: {
  attachments: readonly AttachmentPreview[];
  label?: string;
  bordered?: boolean;
}) => {
  if (!attachments.length) return null;

  return (
    <div
      className={clsx(
        bordered && "border-border overflow-hidden rounded-md border",
      )}
    >
      <div
        className={clsx(
          "text-muted-foreground px-2 py-1 text-[10px] font-medium",
          bordered && "border-border border-b",
        )}
      >
        {label} ({attachments.length})
      </div>
      <div>
        {attachments.map((attachment, index) => (
          <AttachmentRow
            key={attachment.id ?? `${attachment.name}-${index}`}
            attachment={attachment}
          />
        ))}
      </div>
    </div>
  );
};
