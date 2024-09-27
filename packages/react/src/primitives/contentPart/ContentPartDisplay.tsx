import type { FC } from "react";
import { useContentPartDisplay } from "../../primitive-hooks/contentPart/useContentPartDisplay";

export type ContentPartPrimitiveDisplayProps = Record<string, never>;

export const ContentPartPrimitiveDisplay: FC = () => {
  const { display } = useContentPartDisplay();
  return display ?? null;
};

ContentPartPrimitiveDisplay.displayName = "ContentPartPrimitive.Display";
