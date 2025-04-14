"use client";

import { ContentPartState } from "../../api/ContentPartRuntime";
import { useContentPart } from "../../context/react/ContentPartContext";
import { TextContentPart, ReasoningContentPart } from "../../types";

export const useContentPartText = () => {
  const text = useContentPart((c) => {
    if (c.type !== "text" && c.type !== "reasoning")
      throw new Error(
        "ContentPartText can only be used inside text or reasoning content parts.",
      );

    return c as ContentPartState & (TextContentPart | ReasoningContentPart);
  });

  return text;
};
