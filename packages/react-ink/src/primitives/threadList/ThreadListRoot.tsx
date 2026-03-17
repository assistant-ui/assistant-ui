import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";

export type ThreadListRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const ThreadListRoot = ({
  children,
  ...boxProps
}: ThreadListRootProps) => {
  return <Box {...boxProps}>{children}</Box>;
};
