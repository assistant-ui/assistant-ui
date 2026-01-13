"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import { SearchDialog } from "@/components/shared/search-dialog";

export function Provider({ children }: { children: ReactNode }) {
  return <RootProvider search={{ SearchDialog }}>{children}</RootProvider>;
}
