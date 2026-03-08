import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";

export type ThreadListItemRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const ThreadListItemRoot = ({
  children,
  ...boxProps
}: ThreadListItemRootProps) => {
  return <Box {...boxProps}>{children}</Box>;
};
