"use client";

import { ContentPartState } from "../../api/ContentPartRuntime";
import { useContentPart } from "../../context/react/ContentPartContext";
import { ReasoningContentPart } from "../../types";

export const useContentPartReasoning = () => {
  const text = useContentPart((c) => {
    if (c.type !== "reasoning")
      throw new Error(
        "ContentPartReasoning can only be used inside reasoning content parts.",
      );

    return c as ContentPartState & ReasoningContentPart;
  });

  return text;
};
