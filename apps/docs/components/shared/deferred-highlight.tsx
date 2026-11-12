"use client";

import { Component, lazy, Suspense, type ReactNode } from "react";
import type { ShikiHighlighterProps } from "react-shiki";

const ShikiHighlighter = lazy(() => import("react-shiki"));

class HighlightBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

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
    <HighlightBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <ShikiHighlighter {...props} />
      </Suspense>
    </HighlightBoundary>
  );
}
