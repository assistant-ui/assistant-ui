import { type FC } from "react";
import { useContentPartContext, useMessageContext } from "../../context";
import { OutPortal } from "../../utils/OutPortal";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export type ContentPartPrimitiveInProgressIndicatorProps = {};

export const ContentPartPrimitiveInProgressIndicator: FC<
  ContentPartPrimitiveInProgressIndicatorProps
> = () => {
  const { useMessageUtils } = useMessageContext();
  const { useContentPart } = useContentPartContext();

  const indicator = useCombinedStore(
    [useMessageUtils, useContentPart],
    (m, c) => (c.status === "in_progress" ? m.inProgressIndicator : null),
  );
  return <OutPortal node={indicator} />;
};

ContentPartPrimitiveInProgressIndicator.displayName =
  "ContentPartPrimitive.InProgressIndicator";
