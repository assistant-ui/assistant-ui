import { useContentPartContext } from "../../context/react/ContentPartContext";

export const useContentPartImage = () => {
  const { useContentPart } = useContentPartContext();

  const image = useContentPart((c) => {
    if (c.part.type !== "image")
      throw new Error(
        "ContentPartImage can only be used inside image content parts.",
      );

    return c.part.image;
  });

  return image;
};
