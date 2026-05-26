"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace ArtifactPrimitiveSource {
  export type Element = HTMLDivElement;
  export type Props = ComponentPropsWithoutRef<"div">;
}

export const ArtifactPrimitiveSource = forwardRef<
  ArtifactPrimitiveSource.Element,
  ArtifactPrimitiveSource.Props
>(({ children, ...rest }, ref) => {
  const artifact = useAuiState((s) => s.artifacts.selected);
  return (
    <div data-language={artifact?.language ?? undefined} {...rest} ref={ref}>
      {children ?? artifact?.content ?? null}
    </div>
  );
});

ArtifactPrimitiveSource.displayName = "ArtifactPrimitive.Source";
