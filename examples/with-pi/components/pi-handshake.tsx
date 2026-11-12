"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PiModelOption } from "../lib/pi-model-catalog";

export type { PiModelOption } from "../lib/pi-model-catalog";

/** The slice of the server handshake the composer needs to render its model
 * selector. Provided by the page (which fetches `/api/pi/handshake`) and
 * consumed deep inside the composer, so the model picker can live in the
 * composer action bar without prop-drilling through the Thread. */
export type PiHandshakeValue = {
  models: PiModelOption[];
  selectedModelId?: string | undefined;
};

const PiHandshakeContext = createContext<PiHandshakeValue | null>(null);

export function PiHandshakeProvider({
  value,
  children,
}: {
  value: PiHandshakeValue | null;
  children: ReactNode;
}) {
  return (
    <PiHandshakeContext.Provider value={value}>
      {children}
    </PiHandshakeContext.Provider>
  );
}

export function usePiHandshake(): PiHandshakeValue | null {
  return useContext(PiHandshakeContext);
}
