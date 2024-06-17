import type { FC } from "react";
import { useContentPartContext } from "../../context/ContentPartContext";

export const ContentPartDisplay: FC = () => {
  const { useContentPart } = useContentPartContext();

  const display = useContentPart((c) => {
    if (c.part.type !== "ui" && c.part.type !== "tool-call")
      throw new Error(
        "ContentPartDisplay can only be used inside tool-call or ui content parts.",
      );

    return c.part.display;
  });

  return display ?? null;
};
