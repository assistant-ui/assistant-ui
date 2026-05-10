"use client";

import {
  createContext,
  type ComponentPropsWithoutRef,
  useContext,
  memo,
} from "react";
import type { PreComponent } from "./types";
import { memoCompareNodes } from "../memoization";

export const PreContext = createContext<Omit<
  ComponentPropsWithoutRef<PreComponent>,
  "children"
> | null>(null);

export const useIsMarkdownCodeBlock = () => {
  return useContext(PreContext) !== null;
};

const PreOverrideImpl: PreComponent = ({ children, ...rest }) => {
  return <PreContext.Provider value={rest}>{children}</PreContext.Provider>;
};

export const PreOverride = memo(PreOverrideImpl, memoCompareNodes);
