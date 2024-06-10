"use client";

import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef } from "react";
import { useThreadContext } from "../../context/AssistantContext";
import { useMessageContext } from "../../context/MessageContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

type ActionBarRootElement = ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

enum HideAndFloatStatus {
  Hidden = "hidden",
  Floating = "floating",
  Normal = "normal",
}

export type ActionBarRootProps = PrimitiveDivProps & {
  hideWhenRunning?: boolean;
  autohide?: "always" | "not-last" | "never";
  autohideFloat?: "always" | "single-branch" | "never";
};

export const ActionBarRoot = forwardRef<
  ActionBarRootElement,
  ActionBarRootProps
>(({ hideWhenRunning, autohide, autohideFloat, ...rest }, ref) => {
  const { useThread } = useThreadContext();
  const { useMessage } = useMessageContext();

  const hideAndfloatStatus = useCombinedStore(
    [useThread, useMessage],
    (t, m) => {
      if (hideWhenRunning && t.isRunning) return HideAndFloatStatus.Hidden;

      const autohideEnabled =
        autohide === "always" || (autohide === "not-last" && !m.isLast);

      // normal status
      if (!autohideEnabled) return HideAndFloatStatus.Normal;

      // hidden status
      if (!m.isHovering) return HideAndFloatStatus.Hidden;

      // floating status
      if (
        autohideFloat === "always" ||
        (autohideFloat === "single-branch" && m.branches.length <= 1)
      )
        return HideAndFloatStatus.Floating;

      return HideAndFloatStatus.Normal;
    },
  );

  if (hideAndfloatStatus === HideAndFloatStatus.Hidden) return null;

  return (
    <Primitive.div
      data-floating={hideAndfloatStatus === HideAndFloatStatus.Floating}
      {...rest}
      ref={ref}
    />
  );
});
