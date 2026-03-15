import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";

export type StatusBarRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const StatusBarRoot = ({
  children,
  gap = 1,
  ...props
}: StatusBarRootProps) => {
  return (
    <Box gap={gap} {...props}>
      {children}
    </Box>
  );
};

StatusBarRoot.displayName = "StatusBarPrimitive.Root";
