"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { FC } from "react";

export const MessageContent: FC = () => {
  const content = useMessageContext(
    "Message.Content",
    (s) => s.message.content,
  );

  return <>{content}</>;
};
