import type { FC, PropsWithChildren } from "react";
import { useAui, AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const SpanByIndexProvider: FC<PropsWithChildren<{ index: number }>> = ({
  index,
  children,
}) => {
  const parentAui = useAui();

  const config = AuiConfig({
    span: Derived({
      source: "span",
      query: { index },
      get: () => parentAui.span.child({ index }),
    }),
  });
  return (
    <AuiProvider extends={parentAui} config={config}>
      {children}
    </AuiProvider>
  );
};
