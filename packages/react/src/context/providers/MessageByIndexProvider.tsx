"use client";

import { type FC, type PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const MessageByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const aui = useAui({
    message: Derived({
      source: "thread",
      query: { type: "index", index },
      get: (aui) => aui.thread().message({ index }),
    }),
    composer: Derived({
      source: "message",
      query: {},
      get: (aui) => aui.thread().message({ index }).composer(),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
