import type { FC, PropsWithChildren } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { SpanItemState } from "../../o11y-scope";

export namespace SpanPrimitiveIf {
  export type Props = PropsWithChildren<{
    status?: SpanItemState["status"] | SpanItemState["status"][];
    hasChildren?: boolean;
  }>;
}

export const SpanPrimitiveIf: FC<SpanPrimitiveIf.Props> = ({
  status,
  hasChildren,
  children,
}) => {
  const spanStatus = useAuiState((s) => s.span.status);
  const spanHasChildren = useAuiState((s) => s.span.hasChildren);

  if (status !== undefined) {
    const statuses = Array.isArray(status) ? status : [status];
    if (!statuses.includes(spanStatus)) return null;
  }

  if (hasChildren !== undefined && spanHasChildren !== hasChildren) {
    return null;
  }

  return <>{children}</>;
};

SpanPrimitiveIf.displayName = "SpanPrimitive.If";
