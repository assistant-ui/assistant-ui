"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ProviderType } from "@/lib/providers";

interface ProviderContextValue {
  currentProvider: ProviderType;
  setCurrentProvider: (provider: ProviderType) => void;
}

const ProviderContext = createContext<ProviderContextValue | undefined>(undefined);

const STORAGE_KEY = "assistant-ui-dev-provider";

export function ProviderContextProvider({ children }: { children: ReactNode }) {
  const [currentProvider, setCurrentProvider] = useState<ProviderType>("vercel-ai-sdk");

  // Load saved provider from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ["vercel-ai-sdk", "assistant-cloud", "langgraph", "mcp"].includes(saved)) {
      setCurrentProvider(saved as ProviderType);
    }
  }, []);

  // Save provider to localStorage when it changes
  const handleSetProvider = (provider: ProviderType) => {
    setCurrentProvider(provider);
    localStorage.setItem(STORAGE_KEY, provider);
  };

  return (
    <ProviderContext.Provider
      value={{
        currentProvider,
        setCurrentProvider: handleSetProvider,
      }}
    >
      {children}
    </ProviderContext.Provider>
  );
}

export function useProviderContext() {
  const context = useContext(ProviderContext);
  if (!context) {
    throw new Error("useProviderContext must be used within ProviderContextProvider");
  }
  return context;
}