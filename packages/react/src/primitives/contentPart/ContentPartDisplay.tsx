"use client";

import type { FC } from "react";
import { useContentPartDisplay } from "../../primitive-hooks/contentPart/useContentPartDisplay";

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
