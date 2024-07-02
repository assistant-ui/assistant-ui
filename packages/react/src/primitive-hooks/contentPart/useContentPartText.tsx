import { useContentPartContext } from "../../context/react/ContentPartContext";
import { TextContentPartState } from "../../context/stores/ContentPart";

export const useContentPartText = () => {
  const { useContentPart } = useContentPartContext();

  const text = useContentPart((c) => {
    if (c.part.type !== "text")
      throw new Error(
        "ContentPartText can only be used inside text content parts.",
      );

    return c as TextContentPartState;
  });

  return text;
};
