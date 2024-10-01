import { ContentPartState } from "../../api/ContentPartRuntime";
import { useContentPart } from "../../context/react/ContentPartContext";
import { TextContentPart } from "../../types";

export const useContentPartText = () => {
  const text = useContentPart((c) => {
    if (c.type !== "text")
      throw new Error(
        "ContentPartText can only be used inside text content parts.",
      );

    return c as ContentPartState & TextContentPart & { part: TextContentPart };
  });

  return text;
};
