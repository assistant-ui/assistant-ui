import type { FC, PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const SpanByIndexProvider: FC<PropsWithChildren<{ index: number }>> = ({
  index,
  children,
}) => {
  const aui = useAui({
    span: Derived({
      source: "trace",
      query: { index },
      get: (aui) => aui.trace().span({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
