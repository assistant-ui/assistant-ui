"use client";

import { createContext } from "react";
import type { ToolActivity } from "./runtime-activity";

/** Context carrying host-provided tool activity label resolvers to tool rows. */
export const ToolActivityLabelsContext = createContext<
  Record<string, ToolActivity> | undefined
>(undefined);
