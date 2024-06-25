import type { FC } from "react";
import { useContentPartInProgressIndicator } from "../../primitive-hooks/contentPart/useContentPartInProgressIndicator";

export const ContentPartInProgressIndicator: FC = () => {
  const indicator = useContentPartInProgressIndicator();
  return indicator;
};
