"use client";

import type { FC } from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace ArtifactPrimitiveVersionPickerNumber {
  export type Props = Record<string, never>;
}

export const ArtifactPrimitiveVersionPickerNumber: FC<
  ArtifactPrimitiveVersionPickerNumber.Props
> = () => {
  const n = useAuiState((s) => Math.max(s.artifacts.selectedIndex + 1, 0));
  return <>{n}</>;
};

ArtifactPrimitiveVersionPickerNumber.displayName =
  "ArtifactPrimitive.VersionPicker.Number";
