"use client";

import { AuiProvider, Tools, useAui } from "@assistant-ui/react";
import toolkit from "../app/toolkit";

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const aui = useAui({ tools: Tools({ toolkit }) });
  return <AuiProvider value={aui}>{children}</AuiProvider>;
}
