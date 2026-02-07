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

const MIN_WIDTH = 320;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 400;

interface AssistantPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  width: number;
  setWidth: (width: number) => void;
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

export function useAssistantPanelOptional() {
  return useContext(AssistantPanelContext);
}

// Global askAI store — allows SearchDialog (rendered outside the provider by fumadocs)
// to call askAI when AssistantPanelProvider is mounted on the current page.
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
  const [width, setWidthState] = useState(DEFAULT_WIDTH);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const setWidth = useCallback((newWidth: number) => {
    setWidthState(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
  }, []);

  const clearPendingMessage = useCallback(() => {
    setPendingMessage(null);
  }, []);

  const askAI = useCallback((message: string) => {
    setPendingMessage(message);
    setOpen(true);
  }, []);

  // Publish askAI globally so components outside this provider (e.g. SearchDialog) can use it
  useEffect(() => {
    globalAskAI = askAI;
    for (const l of askAIListeners) l();
    return () => {
      globalAskAI = null;
      for (const l of askAIListeners) l();
    };
  }, [askAI]);

  return (
    <AssistantPanelContext.Provider
      value={{
        open,
        setOpen,
        toggle,
        width,
        setWidth,
        pendingMessage,
        clearPendingMessage,
        askAI,
      }}
    >
      {children}
    </AssistantPanelContext.Provider>
  );
}
