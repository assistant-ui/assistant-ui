"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

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
  const [open, setOpen] = useState(false);

  function toggle(): void {
    setOpen((prev) => !prev);
  }

  return (
    <ChatPanelContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </ChatPanelContext.Provider>
  );
}
