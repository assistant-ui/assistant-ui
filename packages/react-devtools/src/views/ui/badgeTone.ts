export const BADGE_TONE = {
  blue: "border-blue-300 bg-blue-500/10 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300",
  emerald:
    "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber:
    "border-amber-300 bg-amber-500/10 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
  red: "border-red-300 bg-red-500/10 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300",
  violet:
    "border-violet-300 bg-violet-500/10 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300",
  zinc: "border-zinc-300 bg-zinc-500/10 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300",
} as const;

export type BadgeTone = keyof typeof BADGE_TONE;

export const BADGE_BASE =
  "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium";
