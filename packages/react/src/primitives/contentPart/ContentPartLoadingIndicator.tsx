import type { FC } from "react";
import { useCombinedStore } from "../../utils/context/combined/useCombinedStore";
import { useContentPartContext } from "../../utils/context/useContentPartContext";
import { useMessageContext } from "../../utils/context/useMessageContext";

export const ContentPartLoadingIndicator: FC = () => {
  const { useMessage } = useMessageContext();
  const { useContentPart } = useContentPartContext();

  const loadingIndicator = useCombinedStore(
    [useMessage, useContentPart],
    (m, c) => (c.isLoading ? m.loadingIndicator : null),
  );
  return loadingIndicator;
};
