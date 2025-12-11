import { createContext, useContext, type ReactNode } from "react";
import { useThreadsStore } from "@/hooks/use-threads-store";

type ThreadsContextValue = ReturnType<typeof useThreadsStore>;

const ThreadsContext = createContext<ThreadsContextValue | null>(null);

export function ThreadsProvider({ children }: { children: ReactNode }) {
  const store = useThreadsStore();

  return (
    <ThreadsContext.Provider value={store}>{children}</ThreadsContext.Provider>
  );
}

export function useThreads() {
  const context = useContext(ThreadsContext);
  if (!context) {
    throw new Error("useThreads must be used within a ThreadsProvider");
  }
  return context;
}
