"use client";

import type { FC } from "react";
import { useContentPartDisplay } from "./useContentPartDisplay";

export namespace ContentPartPrimitiveDisplay {
  export type Props = Record<string, never>;
}

/**
 * @deprecated UI content parts are deprecated and will be removed in the next major version.
 */
export const ContentPartPrimitiveDisplay: FC<
  ContentPartPrimitiveDisplay.Props
> = () => {
  const { display } = useContentPartDisplay();
  return display ?? null;
};

ContentPartPrimitiveDisplay.displayName = "ContentPartPrimitive.Display";
