import { useMemo, useState } from "react";
import clsx from "clsx";
import { CopyButton } from "./CopyButton";

const ENTRY_LIMIT = 100;
const INLINE_MAX = 88;

const isContainer = (value: unknown): value is object =>
  value !== null && typeof value === "object";

type Entry = { key: string; value: unknown };

const entriesOf = (value: unknown): Entry[] => {
  if (Array.isArray(value)) {
    return value.map((item, index) => ({ key: String(index), value: item }));
  }
  return Object.entries(value as Record<string, unknown>).map(
    ([key, value]) => ({ key, value }),
  );
};

const summaryOf = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.length}]`;
  return `{${Object.keys(value as object).length}}`;
};

const serialize = (value: unknown, compact: boolean) =>
  JSON.stringify(value, null, compact ? 0 : 2);

const isInline = (value: unknown, compact: boolean) => {
  if (!compact) return false;
  if (!isContainer(value)) return true;
  return serialize(value, true).length <= INLINE_MAX;
};

const Leaf = ({ value }: { value: unknown }) => {
  if (typeof value === "string") {
    return (
      <span className="text-foreground break-all">&quot;{value}&quot;</span>
    );
  }
  if (value === null || value === undefined) {
    return (
      <span className="text-muted-foreground italic">{String(value)}</span>
    );
  }
  return (
    <span className="text-muted-foreground break-all">{String(value)}</span>
  );
};

const TreeNode = ({
  name,
  value,
  depth,
  openDepth,
  compact,
}: {
  name?: string;
  value: unknown;
  depth: number;
  openDepth: number;
  compact: boolean;
}) => {
  const [open, setOpen] = useState(depth < openDepth);
  const [showAll, setShowAll] = useState(false);

  if (!isContainer(value)) {
    return (
      <div
        className={clsx("flex min-w-0", compact ? "gap-1 py-px" : "gap-1.5")}
      >
        {name !== undefined ? (
          <span className="text-muted-foreground shrink-0">{name}:</span>
        ) : null}
        <Leaf value={value} />
      </div>
    );
  }

  const entries = entriesOf(value);
  const shown = showAll ? entries : entries.slice(0, ENTRY_LIMIT);
  const hidden = entries.length - shown.length;

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          "text-muted-foreground hover:text-foreground flex items-center",
          compact ? "gap-0.5 py-px" : "gap-1",
        )}
      >
        <span
          className={clsx(
            "inline-block transition-transform",
            open && "rotate-90",
          )}
        >
          ›
        </span>
        {name !== undefined ? <span>{name}</span> : null}
        <span className="opacity-60">{summaryOf(value)}</span>
      </button>
      {open ? (
        <div
          className={clsx(
            "border-border/60 border-s",
            compact ? "ms-1 ps-2" : "ms-[5px] ps-3",
          )}
        >
          {shown.map((entry) => (
            <TreeNode
              key={entry.key}
              name={entry.key}
              value={entry.value}
              depth={depth + 1}
              openDepth={openDepth}
              compact={compact}
            />
          ))}
          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-muted-foreground hover:text-foreground text-[10px]"
            >
              +{hidden} more
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const InlineJson = ({
  serialized,
  copyText,
  compact,
}: {
  serialized: string;
  copyText: string;
  compact: boolean;
}) => (
  <div className="flex min-w-0 items-start gap-0.5">
    <code
      className={clsx(
        "text-foreground min-w-0 flex-1 font-mono leading-snug break-all",
        compact ? "text-[10px]" : "text-[11px]",
      )}
      title={serialized}
    >
      {serialized}
    </code>
    <CopyButton
      value={copyText}
      label="Copy JSON"
      iconOnly
      size={compact ? "sm" : "default"}
    />
  </div>
);

const TreeWithCopy = ({
  value,
  openDepth,
  copyText,
  compact,
}: {
  value: unknown;
  openDepth: number;
  copyText: string;
  compact: boolean;
}) => (
  <div className="flex min-w-0 items-start gap-0.5">
    <div
      className={clsx(
        "min-w-0 flex-1 overflow-auto font-mono [font-variant-numeric:tabular-nums] [font-variant-ligatures:none]",
        compact
          ? "max-h-32 text-[10px] leading-snug"
          : "border-border bg-muted/40 max-h-[360px] rounded-md border p-3 text-[11px] leading-relaxed",
      )}
    >
      <TreeNode
        value={value}
        depth={0}
        openDepth={openDepth}
        compact={compact}
      />
    </div>
    <CopyButton
      value={copyText}
      label="Copy JSON"
      iconOnly
      size={compact ? "sm" : "default"}
      className="pt-px"
    />
  </div>
);

/**
 * Recursive JSON view. `compact` fits tool rows; copy always provides formatted JSON.
 */
export const JSONTree = ({
  value,
  openDepth = 1,
  compact = false,
}: {
  value: unknown;
  openDepth?: number;
  compact?: boolean;
}) => {
  const isLeaf = isInline(value, compact) || !isContainer(value);
  const serialized = useMemo(
    () => (isLeaf ? serialize(value, compact) : ""),
    [value, compact, isLeaf],
  );
  const copyText = useMemo(() => JSON.stringify(value, null, 2), [value]);

  if (isLeaf) {
    return (
      <InlineJson
        serialized={serialized}
        copyText={copyText}
        compact={compact}
      />
    );
  }

  return (
    <TreeWithCopy
      value={value}
      openDepth={openDepth}
      copyText={copyText}
      compact={compact}
    />
  );
};
