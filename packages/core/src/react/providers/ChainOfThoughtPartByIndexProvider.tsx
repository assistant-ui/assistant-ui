import { useContext, type FC, type PropsWithChildren } from "react";
import { useAui, AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";
import { ChainOfThoughtPartsContext } from "./ChainOfThoughtByIndicesProvider";

export const ChainOfThoughtPartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const aui = useAui();
  const partsContext = useContext(ChainOfThoughtPartsContext);
  const config = AuiConfig({
    part: Derived({
      source: "chainOfThought",
      query: { type: "index", index },
      get: (aui) =>
        partsContext
          ? aui.message.part({ index: partsContext.startIndex + index })
          : aui.chainOfThought.part({ index }),
    }),
  });
  return (
    <AuiProvider extends={aui} config={config}>
      {children}
    </AuiProvider>
  );
};
