import type { FC } from "react";
import { useContentPartInProgressIndicator } from "../../primitive-hooks/contentPart/useContentPartInProgressIndicator";

export type ContentPartPrimitiveInProgressIndicatorProps = {};

export const ContentPartPrimitiveInProgressIndicator: FC<
  ContentPartPrimitiveInProgressIndicatorProps
> = () => {
  const indicator = useContentPartInProgressIndicator();
  return indicator;
};

ContentPartPrimitiveInProgressIndicator.displayName =
  "ContentPartPrimitive.InProgressIndicator";
