import type { FC } from "react";
import { useContentPartDisplay } from "../../primitive-hooks/contentPart/useContentPartDisplay";

export type ContentPartPrimitiveDisplayProps = {};

export const ContentPartPrimitiveDisplay: FC<
  ContentPartPrimitiveDisplayProps
> = () => {
  const {
    part: { display },
  } = useContentPartDisplay();
  return display ?? null;
};

ContentPartPrimitiveDisplay.displayName = "ContentPartPrimitive.Display";
