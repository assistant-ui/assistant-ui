"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarReload = createActionButton(() => {
  const chat = useThreadContext("ActionBar.Reload", (s) => s.chat);
  const message = useMessageContext("ActionBar.Reload", (s) => s.message);
  return {
    disabled: chat.isLoading || message.role !== "assistant",
    onClick: () => chat.reloadAt(message),
  };
});
