"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { SearchDialog } from "@/components/shared/search-dialog";
import { Toaster } from "@/components/ui/sonner";

export function Provider({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <RootProvider search={{ SearchDialog }}>{children}</RootProvider>

      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast:
              "!rounded-xl !border !bg-popover/95 !text-popover-foreground !shadow-lg !backdrop-blur-sm",
            title: "!text-sm !font-medium",
            description: "!text-sm !text-muted-foreground",
          },
        }}
      />
    </NuqsAdapter>
  );
}
