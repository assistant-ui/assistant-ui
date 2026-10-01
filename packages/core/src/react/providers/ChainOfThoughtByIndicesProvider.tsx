import { createContext, useMemo, type FC, type PropsWithChildren } from "react";
import {
  useAui,
  useAuiState,
  AuiConfig,
  AuiProvider,
} from "@assistant-ui/store";
import { ChainOfThoughtClient } from "../../store/clients/chain-of-thought-client";
import type { ChainOfThoughtPart } from "../../store/scopes/chain-of-thought";
import { useShallowSelector } from "@assistant-ui/store/internal";
import { getMessagePartKeys } from "../../utils/getMessagePartKeys";

export const ChainOfThoughtPartsContext = createContext<{
  partKeys: readonly string[];
  startIndex: number;
} | null>(null);

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
  const partKeys = useAuiState(
    useShallowSelector((s) =>
      getMessagePartKeys(s.message.parts).slice(startIndex, endIndex + 1),
    ),
  );
  const partsContext = useMemo(
    () => ({ partKeys, startIndex }),
    [partKeys, startIndex],
  );

  const parentAui = useAui();

  const config = AuiConfig({
    chainOfThought: ChainOfThoughtClient({
      parts,
      getMessagePart: ({ index }) => {
        if (index < 0 || index >= parts.length) {
          throw new Error(
            `ChainOfThought part index ${index} is out of bounds (0..${parts.length - 1})`,
          );
        }
        return parentAui.message.part({ index: startIndex + index });
      },
    }),
  });
  return (
    <ChainOfThoughtPartsContext.Provider value={partsContext}>
      <AuiProvider extends={parentAui} config={config}>
        {children}
      </AuiProvider>
    </ChainOfThoughtPartsContext.Provider>
  );
};
