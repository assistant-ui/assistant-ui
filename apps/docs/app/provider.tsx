"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { SearchDialog } from "@/components/shared/search-dialog";

export function Provider({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <RootProvider search={{ SearchDialog }}>{children}</RootProvider>
    </NuqsAdapter>
  );
}
