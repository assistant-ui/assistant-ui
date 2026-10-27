import type { ComponentProps, ReactNode } from "react";
import { Text } from "ink";
import { useMessageError } from "@assistant-ui/core/react";
import { sanitizeTerminalText } from "../../sanitizeTerminalText";

export type ErrorMessageProps = ComponentProps<typeof Text> & {
  children?: ReactNode;
};

export const ErrorMessage = ({ children, ...props }: ErrorMessageProps) => {
  const error = useMessageError();

  if (error === undefined) return null;

  return (
    <Text {...props}>{children ?? sanitizeTerminalText(String(error))}</Text>
  );
};

ErrorMessage.displayName = "ErrorPrimitive.Message";
