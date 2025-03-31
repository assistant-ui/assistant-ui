"use client";

import { ContentPartState } from "../../api/ContentPartRuntime";
import { useContentPart } from "../../context/react/ContentPartContext";
import { FileContentPart } from "../../types";

export const useContentPartFile = () => {
  const file = useContentPart((c) => {
    if (c.type !== "file")
      throw new Error(
        "ContentPartFile can only be used inside file content parts.",
      );

    return c as ContentPartState & FileContentPart;
  });

  return file;
};
