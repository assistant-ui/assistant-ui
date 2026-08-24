import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type LoadingRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const LoadingRoot = ({ children, ...boxProps }: LoadingRootProps) => {
  const isRunning = useAuiState((s) => s.thread.isRunning);

  if (!isRunning) return null;

  return <Box {...boxProps}>{children}</Box>;
};

LoadingRoot.displayName = "LoadingPrimitive.Root";
