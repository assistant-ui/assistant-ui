"use client";

import { ProductProvider } from "./contexts/ProductContext";
import { ProductThemeProvider } from "./contexts/ProductThemeProvider";
import { AugmentRuntimeProvider } from "./runtime/AugmentRuntimeProvider";
import { AgentShell } from "./shell/AgentShell";

export function AgentPlaygroundApp() {
  return (
    <ProductProvider>
      <ProductThemeProvider>
        <AugmentRuntimeProvider>
          {(runtimeState) => <AgentShell runtimeState={runtimeState} />}
        </AugmentRuntimeProvider>
      </ProductThemeProvider>
    </ProductProvider>
  );
}
