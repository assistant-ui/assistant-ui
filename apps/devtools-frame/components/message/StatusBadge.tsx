import clsx from "clsx";
import { BADGE_TONE } from "../ui";
import type { BadgeTone } from "../ui";

const TONE: Record<string, BadgeTone> = {
  running: "blue",
  complete: "emerald",
  incomplete: "red",
  "requires-action": "amber",
};

export const StatusBadge = ({
  type,
  reason,
}: {
  type: string;
  reason?: string | undefined;
}) => (
  <span
    className={clsx(
      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
      BADGE_TONE[TONE[type] ?? "zinc"],
    )}
  >
    <span>{type}</span>
    {reason ? <span className="opacity-70">· {reason}</span> : null}
  </span>
);
