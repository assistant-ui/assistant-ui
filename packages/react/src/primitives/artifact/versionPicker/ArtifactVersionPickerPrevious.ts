"use client";

import {
  type ActionButtonElement,
  type ActionButtonProps,
  createActionButton,
} from "../../../utils/createActionButton";
import { useArtifactVersionPickerPrevious as useBehavior } from "@assistant-ui/core/react";

const useArtifactVersionPickerPrevious = () => {
  const { disabled, previous } = useBehavior();
  if (disabled) return null;
  return previous;
};

export namespace ArtifactPrimitiveVersionPickerPrevious {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<
    typeof useArtifactVersionPickerPrevious
  >;
}

export const ArtifactPrimitiveVersionPickerPrevious = createActionButton(
  "ArtifactPrimitive.VersionPicker.Previous",
  useArtifactVersionPickerPrevious,
);
