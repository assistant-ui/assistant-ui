"use client";

import type { ReactNode } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type { ArtifactsState } from "../../../store/clients/artifacts";

export namespace ArtifactPrimitiveIf {
  export type Props = {
    children?: ReactNode;
    fallback?: ReactNode;
    predicate?: (state: ArtifactsState) => boolean;
  };
}

export const ArtifactPrimitiveIf = ({
  children,
  fallback = null,
  predicate,
}: ArtifactPrimitiveIf.Props) => {
  const aui = useAui();
  const hasArtifactsScope = aui.artifacts.source !== null;
  const matches = useAuiState((s) => {
    if (!hasArtifactsScope) return false;
    return predicate ? predicate(s.artifacts) : s.artifacts.selected != null;
  });
  return <>{matches ? children : fallback}</>;
};

ArtifactPrimitiveIf.displayName = "ArtifactPrimitive.If";
