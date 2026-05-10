import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";
import { useMessageError } from "@assistant-ui/core/react";

export type ErrorRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const ErrorRoot = ({ children, ...props }: ErrorRootProps) => {
  const error = useMessageError();
  if (error === undefined) return null;

  return <Box {...props}>{children}</Box>;
};

ErrorRoot.displayName = "ErrorPrimitive.Root";
