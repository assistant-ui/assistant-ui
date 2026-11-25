"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AssistantPanelProvider } from "@/components/pages/docs/assistant/context";
import { SearchProvider } from "@/components/shared/search-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AssistantPanelProvider>
        <SearchProvider>{children}</SearchProvider>
      </AssistantPanelProvider>
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
