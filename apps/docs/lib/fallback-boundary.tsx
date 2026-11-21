"use client";

import { Component, type ReactNode } from "react";

/**
 * Renders `fallback` instead of crashing the page when its children throw,
 * such as a lazily loaded chunk that fails to download.
 */
export class FallbackBoundary extends Component<
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
