"use client";

import { useAssistantState } from "../../context";

export enum HideAndFloatStatus {
  Hidden = "hidden",
  Floating = "floating",
  Normal = "normal",
}

export type UseActionBarFloatStatusProps = {
  hideWhenRunning?: boolean | undefined;
  autohide?: "always" | "not-last" | "never" | undefined;
  autohideFloat?: "always" | "single-branch" | "never" | undefined;
};

export const useActionBarFloatStatus = ({
  hideWhenRunning,
  autohide,
  autohideFloat,
}: UseActionBarFloatStatusProps) => {
  return useAssistantState(({ thread, message }) => {
    if (hideWhenRunning && thread.isRunning) return HideAndFloatStatus.Hidden;

    const autohideEnabled =
      autohide === "always" || (autohide === "not-last" && !message.isLast);

    // normal status
    if (!autohideEnabled) return HideAndFloatStatus.Normal;

    // hidden status
    if (!message.isHovering) return HideAndFloatStatus.Hidden;

    // floating status
    if (
      autohideFloat === "always" ||
      (autohideFloat === "single-branch" && message.branchCount <= 1)
    )
      return HideAndFloatStatus.Floating;

    return HideAndFloatStatus.Normal;
  });
};
