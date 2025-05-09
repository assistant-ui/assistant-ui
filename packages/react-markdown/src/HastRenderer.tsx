"use client";

import { Root } from "hast";
import { Fragment } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { MarkdownTextPrimitiveProps } from "./primitives/MarkdownText";

export interface HastRendererProps {
  hast: Root;
  components?: MarkdownTextPrimitiveProps["components"];
  className?: string | undefined;
}

export function HastRenderer({
  hast,
  components = {},
  className,
}: HastRendererProps) {
  const content = toJsxRuntime(hast, {
    jsx,
    jsxs,
    Fragment,
    components,
  });

  return <div className={className}>{content}</div>;
}
