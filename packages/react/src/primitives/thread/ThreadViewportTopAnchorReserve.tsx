"use client";

import type { FC } from "react";
import { useTopAnchorReserve } from "./topAnchor/useTopAnchorReserve";

export const ThreadPrimitiveViewportTopAnchorReserve: FC = () => {
  useTopAnchorReserve();
  return null;
};

ThreadPrimitiveViewportTopAnchorReserve.displayName =
  "ThreadPrimitive.ViewportTopAnchorReserve";
