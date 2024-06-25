import { useContentPartContext } from "../../context/react/ContentPartContext";
import { useMessageContext } from "../../context/react/MessageContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useContentPartInProgressIndicator = () => {
  const { useMessageUtils } = useMessageContext();
  const { useContentPart } = useContentPartContext();

  const indicator = useCombinedStore(
    [useMessageUtils, useContentPart],
    (m, c) => (c.status === "in_progress" ? m.inProgressIndicator : null),
  );

  return indicator;
};
