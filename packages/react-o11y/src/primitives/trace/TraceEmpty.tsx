import type { FC, PropsWithChildren } from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace TracePrimitiveEmpty {
  export type Props = PropsWithChildren;
}

export const TracePrimitiveEmpty: FC<TracePrimitiveEmpty.Props> = ({
  children,
}) => {
  const spansLength = useAuiState((s) => s.trace.spans.length);

  if (spansLength > 0) return null;

  return <>{children}</>;
};

TracePrimitiveEmpty.displayName = "TracePrimitive.Empty";
