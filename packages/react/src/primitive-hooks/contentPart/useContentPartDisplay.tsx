import { useContentPartContext } from "../../context/react/ContentPartContext";

export const useContentPartDisplay = () => {
  const { useContentPart } = useContentPartContext();

  const display = useContentPart((c) => {
    if (c.part.type !== "ui")
      throw new Error(
        "This component can only be used inside ui content parts.",
      );

    return c.part.display;
  });

  return display;
};
