"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../../utils/createActionButton";
import { useArtifactVersionPickerNext as useBehavior } from "@assistant-ui/core/react";

const useArtifactVersionPickerNext = () => {
  const { disabled, next } = useBehavior();
  if (disabled) return null;
  return next;
};

export namespace ArtifactPrimitiveVersionPickerNext {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useArtifactVersionPickerNext>;
}

export const ArtifactPrimitiveVersionPickerNext = createActionButton(
  "ArtifactPrimitive.VersionPicker.Next",
  useArtifactVersionPickerNext,
);
