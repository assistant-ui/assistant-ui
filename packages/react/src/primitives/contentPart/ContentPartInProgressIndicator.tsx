import type { FC } from "react";
import { useCombinedStore } from "../../utils/context/combined/useCombinedStore";
import { useContentPartContext } from "../../utils/context/useContentPartContext";
import { useMessageContext } from "../../utils/context/useMessageContext";

export const ContentPartInProgressIndicator: FC = () => {
  const { useMessage } = useMessageContext();
  const { useContentPart } = useContentPartContext();

  const indicator = useCombinedStore([useMessage, useContentPart], (m, c) =>
    c.status === "in_progress" ? m.inProgressIndicator : null,
  );
  return indicator;
};
