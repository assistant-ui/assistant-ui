import { forwardRef, type ReactNode, type ComponentProps } from "react";
import { cn } from "@/lib/ui/cn";
import type { LucideIcon } from "lucide-react";

/**
 * Entry Layout System
 *
 * Every activity entry follows this grid structure:
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ [indicator] [icon] [label] [meta]  ← flex →  [timestamp] [actions]│
 * ├──────────────────────────────────────────────────────────────────┤
 * │              [details content - aligned to label column]          │
 * ├──────────────────────────────────────────────────────────────────┤
 * │              [nested content - child entries]                     │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Grid columns:
 * - indicator: 4px (or 0 when inactive)
 * - icon: 28px fixed
 * - content: 1fr (contains label, meta, spacer, timestamp, actions)
 */

const GRID_TEMPLATE = "grid-cols-[4px_28px_1fr]";

type EntryVariant = "default" | "nested" | "response";
type IndicatorState = "none" | "configured" | "error";

const indicatorStyles: Record<IndicatorState, string> = {
  none: "bg-transparent",
  configured: "bg-blue-400/60",
  error: "bg-red-400/60",
};

function EntryRoot({
  children,
  indicator = "none",
  className,
}: {
  children: ReactNode;
  indicator?: IndicatorState;
  className?: string;
}) {
  return (
    <div
      className={cn("group/entry", className)}
      data-indicator={indicator !== "none" ? indicator : undefined}
    >
      {children}
    </div>
  );
}

interface EntryRowProps extends Omit<ComponentProps<"div">, "onClick"> {
  children: ReactNode;
  indicator?: IndicatorState;
  variant?: EntryVariant;
  disabled?: boolean;
  onClick?: () => void;
}

const EntryRow = forwardRef<HTMLDivElement, EntryRowProps>(
  (
    {
      children,
      indicator = "none",
      variant = "default",
      className,
      disabled,
      onClick,
      ...props
    },
    ref,
  ) => {
    const paddingY = variant === "response" ? "py-1" : "py-1.5";

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.();
      }
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={disabled ? undefined : onClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "grid w-full items-center px-4 text-left",
          GRID_TEMPLATE,
          paddingY,
          "pr-2",
          !disabled && "hover:bg-muted/10",
          disabled && "cursor-default",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "h-full w-0.5 justify-self-start rounded-full",
            indicatorStyles[indicator],
          )}
          aria-hidden
        />
        {children}
      </div>
    );
  },
);
EntryRow.displayName = "EntryRow";

function EntryIcon({
  icon: Icon,
  color,
  className,
  style,
}: {
  icon: LucideIcon;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className="flex items-center justify-center" style={style}>
      <Icon className={cn("size-3.5", color, className)} />
    </span>
  );
}

function EntryContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      {children}
    </span>
  );
}

function EntryLabel({
  children,
  color,
  className,
  style,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn("shrink-0 select-none truncate text-xs", color, className)}
      style={style}
    >
      {children}
    </span>
  );
}

function EntryMeta({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("truncate text-muted-foreground text-xs", className)}>
      {children}
    </span>
  );
}

function EntrySpacer() {
  return <span className="flex-1" aria-hidden />;
}

function EntryTimestamp({
  children,
  visible = false,
  muted = false,
  className,
}: {
  children: ReactNode;
  visible?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 text-[10px] tabular-nums transition-opacity",
        muted ? "text-muted-foreground/40" : "text-muted-foreground/60",
        visible ? "opacity-100" : "opacity-0 group-hover/entry:opacity-100",
        className,
      )}
    >
      {children}
    </span>
  );
}

function EntryActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("ml-1 flex shrink-0 items-center", className)}>
      {children}
    </span>
  );
}

function EntryDetails({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid", GRID_TEMPLATE, className)}>
      <span aria-hidden />
      <span aria-hidden />
      <div className="-ml-2.5 border-primary/30 border-l pr-2 pb-1 pl-3">
        {children}
      </div>
    </div>
  );
}

function EntryNested({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("-ml-2.5 grid", GRID_TEMPLATE, className)}>
      <span aria-hidden />
      <span aria-hidden />
      <div>{children}</div>
    </div>
  );
}

type BadgeVariant = "success" | "error" | "warning" | "info";

const badgeStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  error: "bg-red-500/10 text-red-600 dark:text-red-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

function EntryBadge({
  children,
  variant = "info",
  icon: Icon,
  className,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-[10px]",
        badgeStyles[variant],
        className,
      )}
    >
      {Icon && <Icon className="size-2.5" />}
      {children}
    </span>
  );
}

export const Entry = {
  Root: EntryRoot,
  Row: EntryRow,
  Icon: EntryIcon,
  Content: EntryContent,
  Label: EntryLabel,
  Meta: EntryMeta,
  Spacer: EntrySpacer,
  Timestamp: EntryTimestamp,
  Actions: EntryActions,
  Details: EntryDetails,
  Nested: EntryNested,
  Badge: EntryBadge,
};

export type { EntryVariant, IndicatorState, BadgeVariant };
