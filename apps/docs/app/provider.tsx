"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { SearchDialog } from "@/components/shared/search-dialog";
import { WebMcpTools } from "@/components/shared/webmcp-tools";
import { Toaster } from "@/components/ui/sonner";

export function Provider({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <RootProvider search={{ SearchDialog }}>{children}</RootProvider>

      <WebMcpTools />

      <Toaster position="top-center" />
    </NuqsAdapter>
  );
}
