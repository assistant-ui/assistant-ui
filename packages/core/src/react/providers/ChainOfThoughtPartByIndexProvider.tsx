import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const ChainOfThoughtPartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const config = AuiConfig({
    part: Derived({
      source: "chainOfThought",
      query: { type: "index", index },
      get: (aui) => aui.chainOfThought.part({ index }),
    }),
  });
  return <AuiProvider config={config}>{children}</AuiProvider>;
};
