"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

export function Provider({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <RootProvider>{children}</RootProvider>
    </NuqsAdapter>
  );
}
