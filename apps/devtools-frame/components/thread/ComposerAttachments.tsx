import clsx from "clsx";
import { BADGE_TONE } from "../ui";
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
  <span
    className={clsx(
      "rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
      BADGE_TONE[STATUS_TONE[status.type] ?? "zinc"],
    )}
  >
    {statusLabel(status)}
  </span>
);

export const ComposerAttachments = ({
  attachments,
}: {
  attachments: readonly AttachmentPreview[];
}) => {
  if (!attachments.length) return null;

  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="border-b border-zinc-200 bg-zinc-100 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Attachments ({attachments.length})
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
        {attachments.map((attachment, index) => (
          <div
            key={attachment.id ?? index}
            className="flex flex-wrap items-center gap-2 px-3 py-1.5 text-[11px]"
          >
            <span className="font-medium text-zinc-800 dark:text-zinc-100">
              {attachment.name}
            </span>
            {attachment.kind ? (
              <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-zinc-600 uppercase dark:bg-zinc-800 dark:text-zinc-300">
                {attachment.kind}
              </span>
            ) : null}
            {attachment.contentType ? (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
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
