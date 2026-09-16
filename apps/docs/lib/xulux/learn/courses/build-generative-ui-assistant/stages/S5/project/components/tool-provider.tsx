"use client";

import { AuiConfig, AuiProvider, Tools, useAui } from "@assistant-ui/react";
import toolkit from "../app/toolkit";

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const aui = useAui();
  const config = AuiConfig({ tools: Tools({ toolkit }) });
  return (
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
}
