"use client";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarReload = createActionButton(
  (message, chat) => {
    chat.reloadAt(message);
  },
  (message, chat) => message.role === "assistant" && !chat.isLoading,
);
