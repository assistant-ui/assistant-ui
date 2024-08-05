import { useCallback } from "react";
import { useComposerContext, useThreadContext } from "../../context";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useComposerSend = () => {
  const {
    useThread,
    useViewport,
    useComposer: useNewComposer,
  } = useThreadContext();
  const { useComposer } = useComposerContext();

  const disabled = useCombinedStore(
    [useThread, useComposer],
    (t, c) => !t.unstable_canAppendNew || !c.isEditing || c.value.length === 0,
  );

  const callback = useCallback(() => {
    const composerState = useComposer.getState();
    if (!composerState.isEditing) return;

    composerState.send();

    useViewport.getState().scrollToBottom();
    useNewComposer.getState().focus();
  }, [useNewComposer, useComposer, useViewport]);

  if (disabled) return null;
  return callback;
};
