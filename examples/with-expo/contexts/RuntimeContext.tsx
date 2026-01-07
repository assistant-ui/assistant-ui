import { createContext, useContext, type ReactNode } from "react";
import { useAppRuntime } from "@/hooks/use-app-runtime";
import type { LocalRuntime } from "@assistant-ui/react-native";

const RuntimeContext = createContext<LocalRuntime | null>(null);

export function RuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useAppRuntime();

  return (
    <RuntimeContext.Provider value={runtime}>
      {children}
    </RuntimeContext.Provider>
  );
}

export function useRuntime() {
  const context = useContext(RuntimeContext);
  if (!context) {
    throw new Error("useRuntime must be used within a RuntimeProvider");
  }
  return context;
}
