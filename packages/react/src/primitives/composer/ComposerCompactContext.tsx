"use client";

import { createContext, useContext } from "react";

export type ComposerCompactContextValue = {
  setMultiline: (multiline: boolean) => void;
};

export const ComposerCompactContext =
  createContext<ComposerCompactContextValue | null>(null);

export const useComposerCompactContextOptional = () =>
  useContext(ComposerCompactContext);
