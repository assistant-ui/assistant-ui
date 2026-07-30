import type { FC, PropsWithChildren } from "react";
import { useAui, AuiConfig, AuiProvider, Derived } from "@assistant-ui/store";

export const SpanByIndexProvider: FC<PropsWithChildren<{ index: number }>> = ({
  index,
  children,
}) => {
  const parentAui = useAui();

  return (
    <AuiProvider
      config={AuiConfig({
        span: Derived({
          source: "span",
          query: { index },
          get: () => parentAui.span.child({ index }),
        }),
      })}
    >
      {children}
    </AuiProvider>
  );
};
