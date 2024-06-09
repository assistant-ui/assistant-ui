import type { FC } from "react";
import { useContentPartContext } from "../../context/ContentPartContext";
import { useMessageContext } from "../../context/MessageContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const ContentPartInProgressIndicator: FC = () => {
  const { useMessage } = useMessageContext();
  const { useContentPart } = useContentPartContext();

  const indicator = useCombinedStore([useMessage, useContentPart], (m, c) =>
    c.status === "in_progress" ? m.inProgressIndicator : null,
  );
  return indicator;
};
