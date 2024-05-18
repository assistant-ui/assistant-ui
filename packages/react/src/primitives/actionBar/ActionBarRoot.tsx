"use client";

import {
  type ComponentPropsWithoutRef,
  Primitive,
} from "@radix-ui/react-primitive";
import { forwardRef } from "react";
import { useAssistantContext } from "../../utils/context/AssistantContext";
import { useMessageContext } from "../../utils/context/MessageContext";

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

  // TODO merge selectors
  const hideAndfloatStatus = useMessage((m) => {
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
  });

  const busy = useThread((t) => t.isLoading);

  if (hideWhenBusy && busy) return null;
  if (hideAndfloatStatus === HideAndFloatStatus.Hidden) return null;

  return (
    <Primitive.div
      data-floating={hideAndfloatStatus === HideAndFloatStatus.Floating}
      {...rest}
      ref={ref}
    />
  );
});
