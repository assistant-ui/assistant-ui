import type { FC, PropsWithChildren } from "react";
import { AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const PartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const config = AuiConfig({
    part: Derived({
      source: "message",
      query: { type: "index", index },
      get: (aui) => aui.message.part({ index }),
    }),
  });
  return <AuiProvider config={config}>{children}</AuiProvider>;
};
