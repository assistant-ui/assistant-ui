"use client";

import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { forwardRef } from "react";
import { useAssistantContext } from "../../utils/context/AssistantContext";
import { useCombinedStore } from "../../utils/context/combined/useCombinedStore";
import { useMessageContext } from "../../utils/context/useMessageContext";

type ActionBarRootElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = ComponentPropsWithoutRef<typeof Primitive.div>;

enum HideAndFloatStatus {
  Hidden = "hidden",
  Floating = "floating",
  Normal = "normal",
}

export type ActionBarRootProps = PrimitiveDivProps & {
  hideWhenBusy?: boolean;
  autohide?: "always" | "not-last" | "never";
  autohideFloat?: "always" | "single-branch" | "never";
};

export const ActionBarRoot = forwardRef<
  ActionBarRootElement,
  ActionBarRootProps
>(({ hideWhenBusy, autohide, autohideFloat, ...rest }, ref) => {
  const { useThread } = useAssistantContext();
  const { useMessage } = useMessageContext();

  const hideAndfloatStatus = useCombinedStore(
    [useThread, useMessage],
    (t, m) => {
      if (hideWhenBusy && t.isLoading) return HideAndFloatStatus.Hidden;

      const autohideEnabled =
        autohide === "always" || (autohide === "not-last" && !m.isLast);

      // normal status
      if (!autohideEnabled) return HideAndFloatStatus.Normal;

      // hidden status
      if (!m.isHovering) return HideAndFloatStatus.Hidden;

      // floating status
      if (
        autohideFloat === "always" ||
        (autohideFloat === "single-branch" && m.branchState.branchCount <= 1)
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
