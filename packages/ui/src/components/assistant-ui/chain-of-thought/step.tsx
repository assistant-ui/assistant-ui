"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AlertCircleIcon,
  RotateCcwIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepStatus, StepType } from "./model";
import { stepTypeIcons } from "./model";
import {
  CONNECTOR_ENTER_ANIM,
  CONNECTOR_EXIT_ANIM,
  STEP_BASE_CLASS,
  STEP_EXIT_ANIM,
  STEP_ICON_CLASS,
} from "./styles";

export function BulletDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "aui-chain-of-thought-bullet-dot size-1.5 rounded-full bg-current opacity-50",
        className,
      )}
    />
  );
}

export type ChainOfThoughtStepProps = React.ComponentProps<"li"> & {
  status?: StepStatus;
  active?: boolean;
  stepLabel?: string | number;
  type?: StepType;
  icon?: LucideIcon | ReactNode;
  error?: string;
  onRetry?: () => void;
  iconPulse?: boolean;
};

function resolveStepIcon(
  effectiveStatus: StepStatus,
  type: StepType,
  icon: LucideIcon | ReactNode | undefined,
  stepLabel: string | number | undefined,
): ReactNode {
  if (effectiveStatus === "error") {
    if (stepLabel !== undefined) {
      return (
        <span className="aui-chain-of-thought-step-indicator-error-label font-medium text-[10px] text-destructive">
          !
        </span>
      );
    }
    return <AlertCircleIcon className={STEP_ICON_CLASS} />;
  }

  if (stepLabel !== undefined) {
    return (
      <span
        className={cn(
          "aui-chain-of-thought-step-indicator-label font-medium text-[10px]",
          effectiveStatus === "active"
            ? "text-primary"
            : "text-muted-foreground",
        )}
      >
        {stepLabel}
      </span>
    );
  }

  if (icon) {
    if (typeof icon === "function") {
      const Icon = icon as LucideIcon;
      return <Icon className={STEP_ICON_CLASS} />;
    }
    return icon;
  }

  const TypeIcon = stepTypeIcons[type];
  if (TypeIcon === null) {
    return <BulletDot />;
  }
  return <TypeIcon className={STEP_ICON_CLASS} />;
}

export function ChainOfThoughtStep({
  className,
  status,
  active,
  stepLabel,
  type = "default",
  icon,
  error,
  onRetry,
  iconPulse,
  children,
  ...props
}: ChainOfThoughtStepProps) {
  const effectiveStatus: StepStatus = error
    ? "error"
    : active
      ? "active"
      : (status ?? "complete");

  const isActive = effectiveStatus === "active";
  const isError = effectiveStatus === "error";
  const hasBorder = !!stepLabel || effectiveStatus === "error";

  const iconElement = resolveStepIcon(effectiveStatus, type, icon, stepLabel);

  return (
    <li
      data-slot="chain-of-thought-step"
      data-status={effectiveStatus}
      data-type={type}
      className={cn(
        STEP_BASE_CLASS,
        "pl-8",
        "first-of-type:[&>[data-slot=chain-of-thought-step-connector-above]]:hidden",
        "last-of-type:[&>[data-slot=chain-of-thought-step-connector-below]]:hidden",
        className,
      )}
      {...props}
    >
      <span
        data-slot="chain-of-thought-step-connector-above"
        aria-hidden
        className={cn(
          "absolute top-0 left-[9.5px] h-[7px] w-px bg-foreground/15",
          CONNECTOR_ENTER_ANIM,
          CONNECTOR_EXIT_ANIM,
        )}
      />
      <span
        data-slot="chain-of-thought-step-connector-below"
        aria-hidden
        className={cn(
          "absolute top-[27px] bottom-0 left-[9.5px] w-px bg-foreground/15",
          CONNECTOR_ENTER_ANIM,
          CONNECTOR_EXIT_ANIM,
        )}
      />
      <span
        data-slot="chain-of-thought-step-indicator"
        data-status={effectiveStatus}
        className={cn(
          "aui-chain-of-thought-step-indicator transform-gpu",
          "absolute top-[7px] left-0 flex size-5 shrink-0 items-center justify-center rounded-full",
          "bg-background",
          "group-data-[variant=muted]/chain-of-thought-root:bg-muted",
          "group-data-[variant=muted]/chain-of-thought-root:dark:bg-card",
          "transition-[border-color,background-color,box-shadow] duration-200 ease-(--spring-easing)",
          hasBorder && "border",
          hasBorder &&
            isActive &&
            "border-primary bg-primary/10 shadow-[0_0_0_4px_hsl(var(--primary)/0.1)]",
          hasBorder &&
            effectiveStatus === "complete" &&
            "border-muted-foreground/40",
          hasBorder &&
            effectiveStatus === "pending" &&
            "border-muted-foreground/20",
          hasBorder &&
            isError &&
            "border-destructive bg-destructive/10 shadow-[0_0_0_4px_hsl(var(--destructive)/0.1)]",
          !hasBorder &&
            "data-[status=active]:text-primary data-[status=complete]:text-muted-foreground data-[status=error]:text-destructive data-[status=pending]:text-muted-foreground/50",
          "fade-in-0 zoom-in-85 animate-in overflow-visible fill-mode-both blur-in-[3px] delay-[var(--step-delay)] duration-(--animation-duration) ease-(--spring-easing) will-change-[transform,opacity,filter] motion-reduce:animate-none",
          STEP_EXIT_ANIM,
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center",
            "transition-opacity duration-300",
            isActive &&
              iconPulse !== false &&
              "animate-pulse [animation-duration:1.5s] motion-reduce:animate-none",
          )}
        >
          {iconElement}
        </span>
      </span>

      <div
        data-slot="chain-of-thought-step-content"
        className={cn(
          "aui-chain-of-thought-step-content",
          "min-w-0 flex-1 text-muted-foreground leading-relaxed",
          "break-words [overflow-wrap:anywhere]",
          "transition-colors duration-200",
          "fade-in-0 slide-in-from-top-[8px] animate-in fill-mode-both delay-[var(--step-delay)] duration-(--animation-duration) ease-(--spring-easing)",
          STEP_EXIT_ANIM,
          isActive && "text-foreground",
          isError && "text-destructive",
          "motion-reduce:animate-none",
        )}
      >
        {children}
        {error && (
          <div className="aui-chain-of-thought-step-error-row mt-1.5 flex items-center gap-2">
            <span className="aui-chain-of-thought-step-error-text text-destructive text-xs">
              {error}
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={cn(
                  "aui-chain-of-thought-step-retry inline-flex items-center gap-1 rounded-md px-2 py-0.5",
                  "bg-destructive/10 text-destructive text-xs",
                  "transition-colors hover:bg-destructive/20",
                  "focus:outline-none focus:ring-2 focus:ring-destructive/50",
                  "[&_svg]:size-3",
                )}
              >
                <RotateCcwIcon aria-hidden />
                Retry
              </button>
            )}
          </div>
        )}
        {active && (
          <span
            aria-hidden
            data-slot="chain-of-thought-step-shimmer"
            className={cn(
              "aui-chain-of-thought-step-shimmer shimmer pointer-events-none absolute inset-0",
              "motion-reduce:animate-none",
            )}
          />
        )}
      </div>
    </li>
  );
}

export function ChainOfThoughtAnnouncer({
  message,
}: {
  message: string | null;
}) {
  const [announcement, setAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setAnnouncement(message);
      const timer = setTimeout(() => setAnnouncement(null), 1000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [message]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-slot="chain-of-thought-announcer"
      className="aui-chain-of-thought-announcer sr-only"
    >
      {announcement}
    </div>
  );
}

export function ChainOfThoughtStepHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chain-of-thought-step-header"
      className={cn(
        "aui-chain-of-thought-step-header font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function ChainOfThoughtStepBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chain-of-thought-step-body"
      className={cn(
        "aui-chain-of-thought-step-body",
        "[&_li]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export function ChainOfThoughtStepBadges({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chain-of-thought-step-badges"
      className={cn(
        "aui-chain-of-thought-step-badges mt-1.5 flex flex-wrap gap-1.5 pb-0.5",
        className,
      )}
      {...props}
    />
  );
}

export function ChainOfThoughtBadge({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="chain-of-thought-badge"
      className={cn(
        "aui-chain-of-thought-badge",
        "inline-flex items-center rounded-full bg-muted px-2.5 py-0.5",
        "text-muted-foreground text-xs",
        className,
      )}
      {...props}
    />
  );
}

export type ChainOfThoughtToolBadgeProps = React.ComponentProps<"span"> & {
  toolName: string;
  status?: "running" | "complete" | "error";
  showIcon?: boolean;
};

export function ChainOfThoughtToolBadge({
  toolName,
  status = "complete",
  showIcon = true,
  className,
  ...props
}: ChainOfThoughtToolBadgeProps) {
  const isRunning = status === "running";
  const isError = status === "error";

  return (
    <span
      data-slot="chain-of-thought-tool-badge"
      data-status={status}
      className={cn(
        "aui-chain-of-thought-tool-badge",
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        "text-xs",
        isError
          ? "border-destructive/30 text-destructive"
          : "border-border text-muted-foreground",
        className,
      )}
      {...props}
    >
      {showIcon && isRunning && (
        <span
          aria-hidden
          className="aui-chain-of-thought-tool-badge-spinner size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {showIcon && isError && (
        <AlertCircleIcon
          aria-hidden
          className="aui-chain-of-thought-tool-badge-error-icon size-3"
        />
      )}
      {showIcon && !isRunning && !isError && (
        <WrenchIcon
          aria-hidden
          className="aui-chain-of-thought-tool-badge-icon size-3"
        />
      )}
      <span className="aui-chain-of-thought-tool-badge-name truncate">
        {toolName}
      </span>
    </span>
  );
}

export function ChainOfThoughtStepImage({
  className,
  src,
  alt = "",
  ...props
}: React.ComponentProps<"div"> & { src?: string; alt?: string }) {
  if (!src) return null;

  return (
    <div
      data-slot="chain-of-thought-step-image"
      className={cn(
        "aui-chain-of-thought-step-image mt-2 overflow-hidden rounded-lg",
        className,
      )}
      {...props}
    >
      <img
        src={src}
        alt={alt}
        className="aui-chain-of-thought-step-image-img max-h-48 w-auto rounded-lg border object-cover"
      />
    </div>
  );
}

export function renderStepTypeBaseIcon(type: StepType) {
  const TypeIcon = stepTypeIcons[type];
  if (TypeIcon === null) return <BulletDot />;
  if (!TypeIcon) return <BulletDot />;
  return <TypeIcon className={STEP_ICON_CLASS} />;
}
