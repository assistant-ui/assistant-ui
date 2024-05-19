"use client";

import type { FC } from "react";
import { useMessageContext } from "../../utils/context/MessageContext";

export const MessageContent: FC = () => {
  const { useMessage } = useMessageContext();
  const content = useMessage((s) => s.message.content);

  if (content[0]?.type !== "text")
    throw new Error("Unsupported message content type");

  return <>{content[0].text}</>;
};
