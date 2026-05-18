import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";

export type StatusBarPrimitiveRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export namespace StatusBarPrimitiveRoot {
  export type Props = StatusBarPrimitiveRootProps;
}

export const StatusBarPrimitiveRoot = ({
  children,
  gap = 1,
  ...props
}: StatusBarPrimitiveRoot.Props) => {
  return (
    <Box gap={gap} {...props}>
      {children}
    </Box>
  );
};

StatusBarPrimitiveRoot.displayName = "StatusBarPrimitive.Root";
