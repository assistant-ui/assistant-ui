"use client";

import type { ReactNode } from "react";
import { DOCS_SIDEBAR_WIDTH } from "@/components/pages/docs/contexts/sidebar";

export function DocsShell({ children }: { children: ReactNode }): ReactNode {
  return (
    <div
      className="docs-shell"
      style={
        {
          "--sidebar-width": `${DOCS_SIDEBAR_WIDTH}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function DocsContent({ children }: { children: ReactNode }): ReactNode {
  return (
    <div
      data-docs-content=""
      className="@container md:ml-(--sidebar-width)"
      style={
        {
          "--sidebar-width": `${DOCS_SIDEBAR_WIDTH}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
