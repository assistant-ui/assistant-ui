"use client";

import type { ReactNode } from "react";
import { AuiConfig, AuiProvider } from "@assistant-ui/react";

const EMPTY_CONFIG = AuiConfig({});

/** Docs pages render inside the docs assistant's runtime, so a sample that creates its own runtime starts from an empty scope instead of nesting in that one. */
export function SampleScope({ children }: { children: ReactNode }) {
  return (
    <AuiProvider extends={null} config={EMPTY_CONFIG}>
      {children}
    </AuiProvider>
  );
}
