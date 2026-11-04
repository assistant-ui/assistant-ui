import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const field =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document";

export function Stage({
  children,
  controls,
  log,
  className,
}: {
  children: ReactNode;
  controls?: ReactNode;
  log?: ReactNode;
  className?: string;
}) {
  return (
    <div className="not-prose my-6">
      <div
        className={cn(
          field,
          "text-foreground px-4 py-6 text-sm [--focus-ring:var(--ring)] sm:px-6",
          className,
        )}
      >
        {children}
        {log !== undefined && (
          <div className="text-muted-foreground mt-4 font-mono text-xs leading-relaxed [font-variant-ligatures:none]">
            {log}
          </div>
        )}
      </div>
      {controls && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          {controls}
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-7 rounded-sm px-2.5 transition-colors motion-reduce:transition-none",
            value === option.value
              ? "bg-foreground/[0.06] text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Range({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-muted-foreground flex items-center gap-2">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-foreground w-32"
      />
      <span className="w-12 tabular-nums">{value}px</span>
    </label>
  );
}

export function ControlButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] h-7 rounded-sm px-2.5 transition-colors motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}

export function Placeholder({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-document h-8 w-full", className)} />;
}

export function ErrorNotice({
  code,
  message,
  retry,
}: {
  code: string;
  message: string;
  retry: () => void;
}) {
  return (
    <div
      role="alert"
      className="border-foreground/10 rounded-document flex flex-wrap items-center justify-between gap-3 border px-3 py-2"
    >
      <span>
        <span className="font-mono text-xs">{code}</span>{" "}
        <span className="text-muted-foreground">{message}</span>
      </span>
      <button
        type="button"
        onClick={retry}
        className="hover:bg-foreground/[0.05] h-7 rounded-sm px-2.5 text-[13px] transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
