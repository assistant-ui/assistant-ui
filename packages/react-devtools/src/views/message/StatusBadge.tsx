import clsx from "clsx";
import { STATUS_TONE, ToneBadge } from "../ui";

export const StatusBadge = ({
  type,
  reason,
  compact = false,
  size = "default",
  className,
}: {
  type: string;
  reason?: string | undefined;
  /** Omits the reason segment — better for narrow transcript rails. */
  compact?: boolean;
  size?: "default" | "sm";
  className?: string | undefined;
}) => (
  <ToneBadge
    tone={STATUS_TONE[type]}
    size={size}
    className={clsx("inline-flex max-w-full items-center gap-0.5", className)}
  >
    <span className="truncate">{type}</span>
    {!compact && reason ? (
      <span className="truncate opacity-70">· {reason}</span>
    ) : null}
  </ToneBadge>
);
