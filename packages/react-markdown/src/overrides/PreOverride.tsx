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
  // The pre element is re-emitted by CodeOverride, which only runs for a
  // code child. A pre without one (e.g. raw HTML via rehype-raw) would
  // otherwise lose its element entirely, so it is rendered directly here.
  // Deliberately a plain pre, not the consumer's components.pre: that
  // component's chrome is drawn to sit under a CodeHeader and would be
  // wrong standalone, and a dedicated raw-pre slot would be new API.
  const hasCodeChild =
    rest.node?.children.some(
      (child) => child.type === "element" && child.tagName === "code",
    ) ?? true;

  if (!hasCodeChild) {
    const { node: _, ...preProps } = rest;
    return <pre {...preProps}>{children}</pre>;
  }

  return <PreContext.Provider value={rest}>{children}</PreContext.Provider>;
};

export const PreOverride = memo(PreOverrideImpl, memoCompareNodes);
