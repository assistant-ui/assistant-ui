import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";

export type ComposerRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const ComposerRoot = ({ children, ...boxProps }: ComposerRootProps) => {
  return <Box {...boxProps}>{children}</Box>;
};
