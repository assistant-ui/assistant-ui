import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";

export type ChainOfThoughtRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const ChainOfThoughtRoot = ({
  children,
  ...boxProps
}: ChainOfThoughtRootProps) => {
  return <Box {...boxProps}>{children}</Box>;
};
