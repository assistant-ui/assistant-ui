"use client";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarReload = createActionButton(
  (message, chat) => {
    chat.reloadAt(message);
  },
  (msg) => msg.role === "assistant",
);
