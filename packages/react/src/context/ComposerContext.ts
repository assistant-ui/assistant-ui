import { useContext, useMemo } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import { MessageContext } from "./MessageContext";
import { useThreadContext } from "./ThreadContext";
import type { ComposerState } from "./stores/Composer";
import type { EditComposerState } from "./stores/MessageComposer";

export type ComposerContextValue = {
  useComposer: UseBoundStore<StoreApi<EditComposerState | ComposerState>>;
  type: "edit" | "new";
};

export const useComposerContext = (): ComposerContextValue => {
  const { useComposer } = useThreadContext();
  const { useComposer: useEditComposer } = useContext(MessageContext) ?? {};
  return useMemo(
    () => ({
      useComposer: (useEditComposer ?? useComposer) as UseBoundStore<
        StoreApi<EditComposerState | ComposerState>
      >,
      type: useEditComposer ? ("edit" as const) : ("new" as const),
    }),
    [useEditComposer, useComposer],
  );
};
