"use client";

import { ContentPartState } from "../../api/ContentPartRuntime";
import { useContentPart } from "../../context/react/ContentPartContext";
import { ImageContentPart } from "../../types";

export const useContentPartImage = () => {
  const image = useContentPart((c) => {
    if (c.type !== "image")
      throw new Error(
        "ContentPartImage can only be used inside image content parts.",
      );

    return c as ContentPartState & ImageContentPart;
  });

  return image;
};
