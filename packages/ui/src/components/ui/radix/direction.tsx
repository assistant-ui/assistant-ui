"use client";

import type * as React from "react";
import {
  DirectionProvider as DirectionProviderPrimitive,
  useDirection,
} from "@base-ui/react/direction-provider";

function DirectionProvider({
  dir,
  direction,
  children,
}: React.ComponentProps<typeof DirectionProviderPrimitive> & {
  dir?: React.ComponentProps<typeof DirectionProviderPrimitive>["direction"];
}) {
  return (
    <DirectionProviderPrimitive direction={direction ?? dir}>
      {children}
    </DirectionProviderPrimitive>
  );
}

export { DirectionProvider, useDirection };
