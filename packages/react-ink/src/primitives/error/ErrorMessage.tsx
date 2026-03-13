import type { ReactNode } from "react";
import { Text } from "ink";
import { useMessageError } from "./useMessageError";

export type ErrorMessageProps = {
  children?: ReactNode;
};

export const ErrorMessage = ({ children }: ErrorMessageProps) => {
  const error = useMessageError();

  if (error === undefined) return null;

  return <Text color="red">{children ?? String(error)}</Text>;
};

ErrorMessage.displayName = "ErrorPrimitive.Message";
