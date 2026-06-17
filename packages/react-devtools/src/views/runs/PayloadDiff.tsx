import clsx from "clsx";
import { diffValues } from "../../utils/diff";
import type { DiffEntry } from "../../utils/diff";

const SIGN: Record<DiffEntry["kind"], { mark: string; tone: string }> = {
  added: { mark: "+", tone: "text-emerald-600 dark:text-emerald-400" },
  removed: { mark: "−", tone: "text-red-600 dark:text-red-400" },
  changed: { mark: "~", tone: "text-amber-600 dark:text-amber-400" },
};

const format = (value: unknown) =>
  typeof value === "string" ? `"${value}"` : JSON.stringify(value);

export const PayloadDiff = ({
  before,
  after,
}: {
  before: unknown;
  after: unknown;
}) => {
  const entries = diffValues(before, after);

  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground text-[11px]">
        no change from the previous event in this scope
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 font-mono text-[11px]">
      {entries.map((entry, index) => {
        const { mark, tone } = SIGN[entry.kind];
        return (
          <div key={index} className="flex flex-wrap items-baseline gap-1.5">
            <span className={clsx("shrink-0", tone)}>{mark}</span>
            <span className="text-muted-foreground">{entry.path}</span>
            <span className="text-foreground break-all">
              {entry.kind === "changed"
                ? `${format(entry.before)} → ${format(entry.after)}`
                : format(entry.kind === "added" ? entry.after : entry.before)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
