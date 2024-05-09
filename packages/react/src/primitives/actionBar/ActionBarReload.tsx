"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { createActionButton } from "../../utils/createActionButton";

export const useActionBarReload = () => {
  const chat = useThreadContext("ActionBar.Reload", (s) => s.chat);
  const message = useMessageContext("ActionBar.Reload", (s) => s.message);

  if (message.role !== "assistant" || chat.isLoading) return null;
  return () => chat.reloadAt(message);
};

export const ActionBarReload = createActionButton(useActionBarReload);
