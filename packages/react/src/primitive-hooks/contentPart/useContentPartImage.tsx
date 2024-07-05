import { useContentPartContext } from "../../context/react/ContentPartContext";
import { ImageContentPartState } from "../../context/stores/ContentPart";

export const useContentPartImage = () => {
  const { useContentPart } = useContentPartContext();

  const image = useContentPart((c) => {
    if (c.part.type !== "image")
      throw new Error(
        "ContentPartImage can only be used inside image content parts.",
      );

    return c as ImageContentPartState;
  });

  return image;
};
