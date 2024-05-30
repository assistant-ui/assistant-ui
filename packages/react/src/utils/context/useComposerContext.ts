import { useContext } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import { useAssistantContext } from "./AssistantContext";
import type {
  MessageComposerState,
  ThreadComposerState,
} from "./stores/ComposerStore";
import { MessageContext } from "./useMessageContext";

export const useComposerContext = () => {
  const { useComposer: useAssisstantComposer } = useAssistantContext();
  const { useComposer: useMessageComposer } = useContext(MessageContext) ?? {};
  return {
    useComposer: (useMessageComposer ?? useAssisstantComposer) as UseBoundStore<
      StoreApi<MessageComposerState | ThreadComposerState>
    >,
    type: useMessageComposer ? ("message" as const) : ("assistant" as const),
  };
};
