import { ToneBadge } from "../ui";
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
  <ToneBadge tone={TONE[type]} className="inline-flex items-center gap-1">
    <span>{type}</span>
    {reason ? <span className="opacity-70">· {reason}</span> : null}
  </ToneBadge>
);
