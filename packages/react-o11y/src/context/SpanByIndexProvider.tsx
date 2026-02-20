import type { FC, PropsWithChildren } from "react";
import { useAui, AuiProvider, Derived } from "@assistant-ui/store";

export const SpanByIndexProvider: FC<PropsWithChildren<{ index: number }>> = ({
  index,
  children,
}) => {
  const parentAui = useAui();

  const aui = useAui({
    span: Derived({
      source: "span",
      query: { index },
      get: () => parentAui.span().child({ index }),
    }),
  });

  return <AuiProvider value={aui}>{children}</AuiProvider>;
};
