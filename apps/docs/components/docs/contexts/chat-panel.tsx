"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const MIN_WIDTH = 320;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 400;

interface ChatPanelContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  width: number;
  setWidth: (width: number) => void;
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
  const [open, setOpen] = useState(false);
  const [width, setWidthState] = useState(DEFAULT_WIDTH);

  function toggle(): void {
    setOpen((prev) => !prev);
  }

  function setWidth(newWidth: number): void {
    setWidthState(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
  }

  return (
    <ChatPanelContext.Provider
      value={{ open, setOpen, toggle, width, setWidth }}
    >
      {children}
    </ChatPanelContext.Provider>
  );
}
