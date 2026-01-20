"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
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
