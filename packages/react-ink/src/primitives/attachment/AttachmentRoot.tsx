import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";

export type AttachmentRootProps = ComponentProps<typeof Box> & {
  children: ReactNode;
};

export const AttachmentRoot = ({
  children,
  ...boxProps
}: AttachmentRootProps) => {
  return <Box {...boxProps}>{children}</Box>;
};
