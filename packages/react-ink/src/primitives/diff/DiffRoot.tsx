import type { ComponentProps, ReactNode } from "react";
import { Box } from "ink";
import { DiffContextProvider } from "./DiffContext";
import type { ParsedFile } from "./types";

export type DiffRootProps = ComponentProps<typeof Box> & {
  files?: ParsedFile[] | undefined;
  children: ReactNode;
};

export const DiffRoot = ({
  files = [],
  children,
  ...boxProps
}: DiffRootProps) => {
  return (
    <DiffContextProvider value={{ files }}>
      <Box flexDirection="column" {...boxProps}>
        {children}
      </Box>
    </DiffContextProvider>
  );
};

DiffRoot.displayName = "DiffPrimitive.Root";
