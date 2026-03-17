import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";

export type ThreadRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const ThreadRoot = ({ children, ...boxProps }: ThreadRootProps) => {
  return (
    <Box flexDirection="column" {...boxProps}>
      {children}
    </Box>
  );
};
