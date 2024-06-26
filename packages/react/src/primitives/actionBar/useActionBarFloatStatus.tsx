"use client";
import { useMessageContext } from "../../context/react/MessageContext";
import { useThreadContext } from "../../context/react/ThreadContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

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
  const { useThread } = useThreadContext();
  const { useMessage, useMessageUtils } = useMessageContext();

  return useCombinedStore(
    [useThread, useMessage, useMessageUtils],
    (t, m, mu) => {
      if (hideWhenRunning && t.isRunning) return HideAndFloatStatus.Hidden;

      const autohideEnabled =
        autohide === "always" || (autohide === "not-last" && !m.isLast);

      // normal status
      if (!autohideEnabled) return HideAndFloatStatus.Normal;

      // hidden status
      if (!mu.isHovering) return HideAndFloatStatus.Hidden;

      // floating status
      if (
        autohideFloat === "always" ||
        (autohideFloat === "single-branch" && m.branches.length <= 1)
      )
        return HideAndFloatStatus.Floating;

      return HideAndFloatStatus.Normal;
    },
  );
};
