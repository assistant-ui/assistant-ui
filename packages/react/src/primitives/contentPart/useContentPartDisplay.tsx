"use client";

import { ContentPartState } from "../../api/ContentPartRuntime";
import { useContentPart } from "../../context/react/ContentPartContext";
import { UIContentPart } from "../../types";

/**
 * @deprecated UI content parts are deprecated and will be removed in v0.8.0.
 */
export const useContentPartDisplay = () => {
  const display = useContentPart((c) => {
    if (c.type !== "ui")
      throw new Error(
        "This component can only be used inside ui content parts.",
      );

    return c as ContentPartState & UIContentPart;
  });

  return display;
};
