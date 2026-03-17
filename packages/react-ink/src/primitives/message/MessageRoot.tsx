import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";

export type MessageRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const MessageRoot = ({ children, ...boxProps }: MessageRootProps) => {
  return <Box {...boxProps}>{children}</Box>;
};
