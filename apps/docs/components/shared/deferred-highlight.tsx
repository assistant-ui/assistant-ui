"use client";

import { lazy, Suspense } from "react";
import { FallbackBoundary } from "@/lib/fallback-boundary";
import type { ShikiHighlighterProps } from "react-shiki";

const ShikiHighlighter = lazy(() => import("react-shiki"));

export function DeferredHighlight(props: ShikiHighlighterProps) {
  const code = (
    <pre>
      <code>{props.children}</code>
    </pre>
  );
  // react-shiki puts `className` on a wrapper div; the fallback keeps that
  // wrapper so a caller's code-sheet styles apply while Shiki loads.
  const fallback = props.className ? (
    <div className={props.className}>{code}</div>
  ) : (
    code
  );
  return (
    <FallbackBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <ShikiHighlighter {...props} />
      </Suspense>
    </FallbackBoundary>
  );
}
