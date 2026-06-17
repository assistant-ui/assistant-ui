import clsx from "clsx";
import { formatDateTime } from "../../utils/common";
import { AttachmentList } from "../attachments";
import { MessageMetrics } from "./MessageMetrics";
import { MessageTimeline } from "./MessageTimeline";
import { RoleLabel } from "./RoleLabel";
import { StatusBadge } from "./StatusBadge";
import { Chip, JSONTree, ToneBadge } from "../ui";
import type { MessagePreview } from "./types";

export const MessageItem = ({
  message,
  showHeader = true,
}: {
  message: MessagePreview;
  /** When false, skips the summary header (role, badges, timestamp). */
  showHeader?: boolean;
}) => {
  const hasBranches =
    message.branchNumber !== undefined &&
    message.branchCount !== undefined &&
    message.branchCount > 1;
  const errorValue =
    message.status && message.status.type === "incomplete"
      ? message.status.error
      : undefined;

  return (
    <div
      className={clsx(
        "flex flex-col px-3",
        showHeader ? "gap-3 py-3" : "gap-2 py-2",
      )}
    >
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <RoleLabel role={message.role} />
            {message.index !== undefined ? (
              <span className="text-muted-foreground text-[11px]">
                #{message.index}
              </span>
            ) : null}
            {message.status ? (
              <StatusBadge
                type={message.status.type}
                reason={message.status.reason}
              />
            ) : null}
            {hasBranches ? (
              <Chip>
                branch {message.branchNumber}/{message.branchCount}
              </Chip>
            ) : null}
            {message.isOptimistic ? (
              <ToneBadge tone="amber">optimistic</ToneBadge>
            ) : null}
            {message.submittedFeedback ? (
              <span className="text-muted-foreground text-[11px]">
                feedback: {message.submittedFeedback}
              </span>
            ) : null}
          </div>
          <span className="text-muted-foreground text-[11px]">
            {formatDateTime(message.createdAt) ?? "—"}
          </span>
        </div>
      ) : null}

      <MessageMetrics message={message} />

      {errorValue !== undefined ? (
        <div className="bg-muted/40 rounded-md border p-2 text-[11px]">
          <ToneBadge tone="red">error</ToneBadge>
          <div className="mt-1">
            <JSONTree value={errorValue} />
          </div>
        </div>
      ) : null}

      {message.attachments.length ? (
        <AttachmentList attachments={message.attachments} />
      ) : null}

      {message.parts.length ? (
        <MessageTimeline parts={message.parts} />
      ) : (
        <div className="text-muted-foreground text-[11px]">
          No content parts
        </div>
      )}
    </div>
  );
};
