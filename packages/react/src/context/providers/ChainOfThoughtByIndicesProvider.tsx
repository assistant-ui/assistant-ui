"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAui, useAuiState, AuiProvider } from "@assistant-ui/store";
import { ChainOfThoughtClient } from "@assistant-ui/core/store";
import type { ChainOfThoughtPart } from "@assistant-ui/core/store";

export const ChainOfThoughtByIndicesProvider: FC<
  PropsWithChildren<{
    startIndex: number;
    endIndex: number;
  }>
> = ({ startIndex, endIndex, children }) => {
  const parts = useAuiState((s) => s.message.parts).slice(
    startIndex,
    endIndex + 1,
  ) as ChainOfThoughtPart[];

  const parentAui = useAui();

  const aui = useAui({
    chainOfThought: ChainOfThoughtClient({
      parts,
      getMessagePart: ({ index }) => {
        if (index < 0 || index >= parts.length) {
          throw new Error(
            `ChainOfThought part index ${index} is out of bounds (0..${parts.length - 1})`,
          );
        }
        return parentAui.message().part({ index: startIndex + index });
      },
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
