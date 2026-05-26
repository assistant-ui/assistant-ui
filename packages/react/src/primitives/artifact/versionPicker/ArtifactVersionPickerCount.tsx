"use client";

import type { FC } from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace ArtifactPrimitiveVersionPickerCount {
  export type Props = Record<string, never>;
}

export const ArtifactPrimitiveVersionPickerCount: FC<
  ArtifactPrimitiveVersionPickerCount.Props
> = () => {
  const count = useAuiState((s) => s.artifacts.count);
  return <>{count}</>;
};

ArtifactPrimitiveVersionPickerCount.displayName =
  "ArtifactPrimitive.VersionPicker.Count";
