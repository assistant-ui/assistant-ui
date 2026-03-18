import type { ComponentProps, ReactNode } from "react";
import { useMemo } from "react";
import { Box } from "ink";
import { DiffContextProvider } from "./DiffContext";
import { parsePatch, computeDiff } from "./diff-utils";

export type DiffRootProps = ComponentProps<typeof Box> & {
  patch?: string | undefined;
  oldFile?: { content: string; name?: string | undefined } | undefined;
  newFile?: { content: string; name?: string | undefined } | undefined;
  children: ReactNode;
};

export const DiffRoot = ({
  patch,
  oldFile,
  newFile,
  children,
  ...boxProps
}: DiffRootProps) => {
  const oldContent = oldFile?.content;
  const oldName = oldFile?.name;
  const newContent = newFile?.content;
  const newName = newFile?.name;

  const files = useMemo(() => {
    if (patch) {
      return parsePatch(patch);
    }
    if (oldContent !== undefined && newContent !== undefined) {
      const { lines, additions, deletions } = computeDiff(
        oldContent,
        newContent,
      );
      return [{ oldName, newName, lines, additions, deletions }];
    }
    return [];
  }, [patch, oldContent, oldName, newContent, newName]);

  return (
    <DiffContextProvider value={{ files }}>
      <Box flexDirection="column" {...boxProps}>
        {children}
      </Box>
    </DiffContextProvider>
  );
};

DiffRoot.displayName = "DiffPrimitive.Root";
