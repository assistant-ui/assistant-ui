"use client";

import { FC } from "react";
import { useIsEditingContext } from "../../utils/context/Context";

type MessageEditingProps = {
  children: React.ReactNode;
};

export const MessageEditing: FC<MessageEditingProps> = ({ children }) => {
  const [isEditing] = useIsEditingContext();
  if (isEditing === false) return null;
  return children;
};
