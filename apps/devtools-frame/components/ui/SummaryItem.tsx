import type { ReactNode } from "react";

export const SummaryItem = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
    <div className="font-semibold text-[10px] text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
      {label}
    </div>
    <div className="mt-1 font-semibold text-zinc-800 dark:text-zinc-100">
      {value}
    </div>
  </div>
);
