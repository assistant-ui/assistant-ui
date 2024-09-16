import { useContentPart } from "../../context/react/ContentPartContext";
import { UIContentPartState } from "../../context/stores/ContentPart";

export const useContentPartDisplay = () => {
  const display = useContentPart((c) => {
    if (c.part.type !== "ui")
      throw new Error(
        "This component can only be used inside ui content parts.",
      );

    return c as UIContentPartState;
  });

  return display;
};
