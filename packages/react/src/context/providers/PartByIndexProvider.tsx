"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const PartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const aui = useAui({
    part: Derived({
      source: "message",
      query: { type: "index", index },
      get: (aui) => aui.message().part({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
