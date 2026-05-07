import type { ReactNode } from "react";

export function ProductThemeProvider({ children }: { children: ReactNode }) {
  return <div data-product="assistant-ui" className="min-h-full">{children}</div>;
}
