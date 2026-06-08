import clsx from "clsx";

const TONE: Record<string, string> = {
  running:
    "border-blue-300 bg-blue-500/10 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300",
  complete:
    "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
  incomplete:
    "border-red-300 bg-red-500/10 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300",
  "requires-action":
    "border-amber-300 bg-amber-500/10 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
  unknown:
    "border-zinc-300 bg-zinc-500/10 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300",
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
      TONE[type] ?? TONE.unknown,
    )}
  >
    <span>{type}</span>
    {reason ? <span className="opacity-70">· {reason}</span> : null}
  </span>
);
