import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";

export type ChecklistRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const ChecklistRoot = ({
  children,
  ...boxProps
}: ChecklistRootProps) => {
  return (
    <Box flexDirection="column" {...boxProps}>
      {children}
    </Box>
  );
};

ChecklistRoot.displayName = "ChecklistPrimitive.Root";
