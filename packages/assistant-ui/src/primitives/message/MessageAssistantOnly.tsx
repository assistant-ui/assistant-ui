"use client";
import { FC } from "react";
import { useMessageContext } from "../../utils/context/Context";
import { MessageUserOnlyProps } from "./MessageUserOnly";

type MessageAssistantOnlyProps = {
  children: React.ReactNode;
};

export const MessageAssistantOnly: FC<MessageAssistantOnlyProps> = ({
  children,
}) => {
  const message = useMessageContext();
  if (message.role !== "assistant") return null;
  return children;
};
