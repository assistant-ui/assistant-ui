"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const ChainOfThoughtPartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const aui = useAui({
    part: Derived({
      source: "chainOfThought",
      query: { type: "index", index },
      get: (aui) => aui.chainOfThought().part({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
