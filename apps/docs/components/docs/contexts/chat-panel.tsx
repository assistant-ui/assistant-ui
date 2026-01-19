"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "docs-chat-panel-open";

interface ChatPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export function useChatPanel() {
  const ctx = useContext(ChatPanelContext);
  if (!ctx) {
    throw new Error("useChatPanel must be used within ChatPanelProvider");
  }
  return ctx;
}

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setOpenState(true);
    }
  }, []);

  function setOpen(value: boolean): void {
    setOpenState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  }

  function toggle(): void {
    setOpenState((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  const effectiveOpen = mounted ? open : false;

  return (
    <ChatPanelContext.Provider value={{ open: effectiveOpen, setOpen, toggle }}>
      {children}
    </ChatPanelContext.Provider>
  );
}
