import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";
import { useThreadIsRunning } from "@assistant-ui/core/react";

export type LoadingRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const LoadingRoot = ({ children, ...boxProps }: LoadingRootProps) => {
  const isRunning = useThreadIsRunning();

  if (!isRunning) return null;

  return <Box {...boxProps}>{children}</Box>;
};

LoadingRoot.displayName = "LoadingPrimitive.Root";
