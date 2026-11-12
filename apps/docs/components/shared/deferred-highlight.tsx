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
  const fallback = (
    <pre>
      <code>{props.children}</code>
    </pre>
  );
  return (
    <HighlightBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <ShikiHighlighter {...props} />
      </Suspense>
    </HighlightBoundary>
  );
}
