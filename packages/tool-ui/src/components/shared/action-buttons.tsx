"use client";

import * as React from "react";
import type { Action } from "../../schemas/shared";
import { cn } from "../../utils/cn";
import { Button } from "./button";
import { useActionButtons } from "../../hooks/use-action-buttons";

export interface ActionButtonsProps {
  actions: Action[];
  onAction: (actionId: string) => void | Promise<void>;
  onBeforeAction?: ((actionId: string) => boolean | Promise<boolean>) | undefined;
  confirmTimeout?: number | undefined;
  align?: "left" | "center" | "right" | undefined;
  className?: string | undefined;
}

/**
 * Sort priority (lower = appears first in sorted array)
 * Combined with flex-col-reverse (mobile) and flex-row-reverse (desktop):
 * - default (primary): first in array -> bottom on mobile, right on desktop
 * - secondary: middle-right
 * - ghost: middle-left (less prominent than secondary)
 * - destructive: last in array -> top on mobile, left on desktop
 */
const VARIANT_SORT_PRIORITY: Record<string, number> = {
  default: 0,
  secondary: 1,
  ghost: 2,
  destructive: 3,
};

function getVariantPriority(variant: string | undefined): number {
  return VARIANT_SORT_PRIORITY[variant ?? "default"] ?? 2;
}

export function ActionButtons({
  actions,
  onAction,
  onBeforeAction,
  confirmTimeout = 3000,
  align = "right",
  className,
}: ActionButtonsProps) {
  const { actions: resolvedActions, runAction } = useActionButtons({
    actions,
    onAction,
    onBeforeAction,
    confirmTimeout,
  });

  // Sort actions by priority: default (0) -> secondary (1) -> destructive (2)
  // Combined with flex-*-reverse, first items appear at bottom (mobile) / right (desktop)
  const sortedActions = React.useMemo(() => {
    return [...resolvedActions].sort(
      (a, b) => getVariantPriority(a.variant) - getVariantPriority(b.variant),
    );
  }, [resolvedActions]);

  // Check if we have destructive actions for visual separation
  const hasDestructive = sortedActions.some((a) => a.variant === "destructive");
  const destructiveIndex = sortedActions.findIndex(
    (a) => a.variant === "destructive",
  );

  return (
    <div
      className={cn(
        // Mobile: full-width stacked buttons (iOS-like), reversed for thumb reach
        "flex flex-col-reverse gap-3",
        // Desktop: inline row reversed so primary/default ends up on right
        "@sm/actions:flex-row-reverse @sm/actions:flex-wrap @sm/actions:items-center @sm/actions:gap-2",
        align === "left" && "@sm/actions:justify-end",
        align === "center" && "@sm/actions:justify-center",
        align === "right" && "@sm/actions:justify-start",
        className,
      )}
    >
      {sortedActions.map((action, index) => {
        const label = action.currentLabel;
        const variant = action.variant || "default";

        // Add top margin to first destructive action on mobile for visual separation
        const isFirstDestructive = hasDestructive && index === destructiveIndex;

        return (
          <Button
            key={action.id}
            variant={variant}
            size="lg"
            onClick={() => runAction(action.id)}
            disabled={action.isDisabled}
            className={cn(
              "rounded-full",
              "justify-center",
              "min-w-24",
              // Mobile: full width, larger touch target, min 44px height
              "min-h-11 w-full text-base",
              // Desktop: fit content, smaller
              "@sm/actions:min-h-0 @sm/actions:w-auto @sm/actions:px-3 @sm/actions:py-2 @sm/actions:text-sm",
              // Visual separation for destructive actions on mobile (top) and desktop (left)
              isFirstDestructive && "mt-2 @sm/actions:mt-0 @sm/actions:mr-2",
              action.isConfirming &&
                "ring-destructive animate-pulse ring-2 ring-offset-2",
            )}
            aria-label={
              action.shortcut ? `${label} (${action.shortcut})` : label
            }
          >
            {action.isLoading && (
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {action.icon && !action.isLoading && (
              <span className="mr-2">{action.icon}</span>
            )}
            {label}
            {action.shortcut && !action.isLoading && (
              <kbd className="border-border bg-muted ml-2.5 hidden rounded-lg border px-2 py-0.5 font-mono text-xs font-medium sm:inline-block">
                {action.shortcut}
              </kbd>
            )}
          </Button>
        );
      })}
    </div>
  );
}
