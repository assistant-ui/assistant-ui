"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";

interface CurrentPageContextValue {
  pathname: string;
}

const CurrentPageContext = createContext<CurrentPageContextValue | null>(null);

export function useCurrentPage() {
  return useContext(CurrentPageContext);
}

export function CurrentPageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <CurrentPageContext.Provider value={{ pathname }}>
      {children}
    </CurrentPageContext.Provider>
  );
}
