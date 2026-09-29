"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

interface AssistantPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  pendingMessage: string | null;
  clearPendingMessage: () => void;
  askAI: (message: string) => void;
}

const AssistantPanelContext = createContext<AssistantPanelContextValue | null>(
  null,
);

export function useAssistantPanel() {
  const ctx = useContext(AssistantPanelContext);
  if (!ctx) {
    throw new Error(
      "useAssistantPanel must be used within AssistantPanelProvider",
    );
  }
  return ctx;
}

type AskAIFn = (message: string) => void;
const askAIListeners = new Set<() => void>();
let globalAskAI: AskAIFn | null = null;

function subscribeAskAI(listener: () => void) {
  askAIListeners.add(listener);
  return () => askAIListeners.delete(listener);
}

function getAskAISnapshot() {
  return globalAskAI;
}

export function useGlobalAskAI(): AskAIFn | null {
  return useSyncExternalStore(subscribeAskAI, getAskAISnapshot, () => null);
}

export function AssistantPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const clearPendingMessage = useCallback(() => {
    setPendingMessage(null);
  }, []);

  const askAI = useCallback((message: string) => {
    setPendingMessage(message);
    setOpen(true);
  }, []);

  useEffect(() => {
    const previous = globalAskAI;
    globalAskAI = askAI;
    for (const l of askAIListeners) l();
    return () => {
      globalAskAI = previous;
      for (const l of askAIListeners) l();
    };
  }, [askAI]);

  return (
    <AssistantPanelContext.Provider
      value={{
        open,
        setOpen,
        toggle,
        pendingMessage,
        clearPendingMessage,
        askAI,
      }}
    >
      {children}
    </AssistantPanelContext.Provider>
  );
}
