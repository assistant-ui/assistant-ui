import type { FC } from "react";
import { useContentPartDisplay } from "../../primitive-hooks/contentPart/useContentPartDisplay";

/**
 * @deprecated Use `ContentPartPrimitive.Display.Props` instead. This will be removed in 0.6.
 */
export type ContentPartPrimitiveDisplayProps =
  ContentPartPrimitiveDisplay.Props;

export namespace ContentPartPrimitiveDisplay {
  export type Props = Record<string, never>;
}

export const ContentPartPrimitiveDisplay: FC<
  ContentPartPrimitiveDisplay.Props
> = () => {
  const { display } = useContentPartDisplay();
  return display ?? null;
};

ContentPartPrimitiveDisplay.displayName = "ContentPartPrimitive.Display";
