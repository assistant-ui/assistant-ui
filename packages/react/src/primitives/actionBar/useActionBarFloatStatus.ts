"use client";

import { useAuiState } from "@assistant-ui/store";

export const HideAndFloatStatus = {
  Hidden: "hidden",
  Floating: "floating",
  Normal: "normal",
} as const;
export type HideAndFloatStatus =
  (typeof HideAndFloatStatus)[keyof typeof HideAndFloatStatus];

export type UseActionBarFloatStatusProps = {
  hideWhenRunning?: boolean | undefined;
  autohide?: "always" | "not-last" | "never" | undefined;
  autohideFloat?: "always" | "single-branch" | "never" | undefined;
  forceVisible?: boolean | undefined;
};

export const useActionBarFloatStatus = ({
  hideWhenRunning,
  autohide,
  autohideFloat,
  forceVisible,
}: UseActionBarFloatStatusProps) => {
  return useAuiState((s) => {
    if (hideWhenRunning && s.thread.isRunning) return HideAndFloatStatus.Hidden;

    const autohideEnabled =
      autohide === "always" || (autohide === "not-last" && !s.message.isLast);
    const isVisibleByInteraction = forceVisible || s.message.isHovering;

    // normal status
    if (!autohideEnabled) return HideAndFloatStatus.Normal;

    // hidden status
    if (!isVisibleByInteraction) return HideAndFloatStatus.Hidden;

    // floating status
    if (
      autohideFloat === "always" ||
      (autohideFloat === "single-branch" && s.message.branchCount <= 1)
    )
      return HideAndFloatStatus.Floating;

    return HideAndFloatStatus.Normal;
  });
};
