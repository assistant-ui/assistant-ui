"use client";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarCopy = createActionButton(
  (message) => {
    navigator.clipboard.writeText(message.content);
  },
  () => true,
);
