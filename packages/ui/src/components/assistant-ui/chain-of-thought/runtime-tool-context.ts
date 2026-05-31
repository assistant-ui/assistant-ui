"use client";

import { createContext } from "react";
import type { ToolActivity } from "./runtime-activity";

export const ToolActivityLabelsContext = createContext<
  Record<string, ToolActivity> | undefined
>(undefined);
