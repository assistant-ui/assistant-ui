import type { FC } from "react";
import { useContentPartDisplay } from "../../primitive-hooks/contentPart/useContentPartDisplay";

export const ContentPartDisplay: FC = () => {
  const display = useContentPartDisplay();
  return display ?? null;
};
