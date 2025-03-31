"use client";

import { ContentPartState } from "../../api/ContentPartRuntime";
import { useContentPart } from "../../context/react/ContentPartContext";
import { SourceContentPart } from "../../types";

export const useContentPartSource = () => {
  const source = useContentPart((c) => {
    if (c.type !== "source")
      throw new Error(
        "ContentPartSource can only be used inside source content parts.",
      );

    return c as ContentPartState & SourceContentPart;
  });

  return source;
};
