import { useMemo, type FC, type PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";
import type { PartMethods } from "../../store/scopes/part";

export const PartByIndexProvider: FC<
  PropsWithChildren<{
    index: number;
  }>
> = ({ index, children }) => {
  const lastPartRef = useMemo(
    () => ({ index, current: null as PartMethods | null }),
    [index],
  );
  const aui = useAui({
    part: Derived({
      source: "message",
      query: { type: "index", index },
      get: (aui) => {
        const message = aui.message();
        if (index >= message.getState().parts.length && lastPartRef.current) {
          return lastPartRef.current;
        }

        const part = message.part({ index });
        lastPartRef.current = part;
        return part;
      },
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
