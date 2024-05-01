"use client";

import { FC } from "react";
import { useMessageContext } from "../../utils/context/Context";

export type MessageUserOnlyProps = {
  children: React.ReactNode;
};

export const MessageUserOnly: FC<MessageUserOnlyProps> = ({ children }) => {
  const message = useMessageContext();
  if (message.role !== "user") return null;
  return children;
};
