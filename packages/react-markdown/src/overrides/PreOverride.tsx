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

type PreOverrideProps = ComponentPropsWithoutRef<PreComponent> & {
  fallbackPre: PreComponent;
};

const PreOverrideImpl = ({
  children,
  fallbackPre: FallbackPre,
  ...rest
}: PreOverrideProps) => {
  // The pre element is re-emitted by CodeOverride, which only runs for a
  // code child. A pre without one (e.g. raw HTML via rehype-raw) would
  // otherwise lose its element entirely, so it is rendered here through the
  // consumer's pre component so raw blocks keep consumer styling.
  const hasCodeChild =
    rest.node?.children.some(
      (child) => child.type === "element" && child.tagName === "code",
    ) ?? true;

  if (!hasCodeChild) return <FallbackPre {...rest}>{children}</FallbackPre>;

  return <PreContext.Provider value={rest}>{children}</PreContext.Provider>;
};

export const PreOverride = memo(
  PreOverrideImpl,
  (prev, next) =>
    prev.fallbackPre === next.fallbackPre && memoCompareNodes(prev, next),
);
