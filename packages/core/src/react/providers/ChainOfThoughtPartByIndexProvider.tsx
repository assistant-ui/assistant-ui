import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const ChainOfThoughtPartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => (
  <AuiProvider
    config={AuiConfig({
      part: Derived({
        source: "chainOfThought",
        query: { type: "index", index },
        get: (aui) => aui.chainOfThought.part({ index }),
      }),
    })}
  >
    {children}
  </AuiProvider>
);
