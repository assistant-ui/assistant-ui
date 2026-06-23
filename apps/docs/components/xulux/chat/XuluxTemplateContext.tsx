"use client";

import type { SelectedTemplateContext } from "../XuluxApp";
import { createContext, useContext, type ReactNode } from "react";

const XuluxTemplateContext = createContext<SelectedTemplateContext | null>(
  null,
);

export function XuluxTemplateProvider({
  template,
  children,
}: {
  template: SelectedTemplateContext | null;
  children: ReactNode;
}) {
  return (
    <XuluxTemplateContext.Provider value={template}>
      {children}
    </XuluxTemplateContext.Provider>
  );
}

export function useXuluxTemplateContext(): SelectedTemplateContext | null {
  return useContext(XuluxTemplateContext);
}
