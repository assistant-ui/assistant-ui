import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";
import { useAuiState } from "@assistant-ui/store";

export type LoadingRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
  gap?: number;
};

export const LoadingRoot = ({
  children,
  gap = 1,
  ...boxProps
}: LoadingRootProps) => {
  const isRunning = useAuiState((s) => s.thread.isRunning);

  if (!isRunning) return null;

  return (
    <Box gap={gap} {...boxProps}>
      {children}
    </Box>
  );
};

LoadingRoot.displayName = "LoadingPrimitive.Root";
