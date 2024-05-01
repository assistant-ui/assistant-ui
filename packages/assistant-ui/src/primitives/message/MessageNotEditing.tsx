"use client";

import { FC } from "react";
import { useIsEditingContext } from "../../utils/context/Context";

type MessageNotEditingProps = {
  children: React.ReactNode;
};

export const MessageNotEditing: FC<MessageNotEditingProps> = ({ children }) => {
  const [isEditing] = useIsEditingContext();
  if (isEditing) return null;
  return children;
};
