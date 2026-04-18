import { createContext, useContext } from "react";
import type { ParsedFile } from "./types";

interface DiffContextValue {
  files: ParsedFile[];
}

const DiffContext = createContext<DiffContextValue | null>(null);

export const useDiffContext = (): DiffContextValue => {
  const ctx = useContext(DiffContext);
  if (!ctx) {
    throw new Error("useDiffContext must be used within a DiffRoot");
  }
  return ctx;
};

export const DiffContextProvider = DiffContext.Provider;
