import { useMemo } from "react";
import { useMessageContext } from "./MessageContext";
import { useThreadContext } from "./ThreadContext";
import type { ComposerState } from "../stores/Composer";
import type { EditComposerState } from "../stores/EditComposer";
import { ReadonlyStore } from "../ReadonlyStore";

export type ComposerContextValue = {
  useComposer: ReadonlyStore<EditComposerState | ComposerState>;
  type: "edit" | "new";
};

export const useComposerContext = (): ComposerContextValue => {
  const { useComposer } = useThreadContext();
  const { useEditComposer } = useMessageContext({ optional: true }) ?? {};
  return useMemo(
    () => ({
      useComposer: (useEditComposer ?? useComposer) as ReadonlyStore<
        EditComposerState | ComposerState
      >,
      type: useEditComposer ? ("edit" as const) : ("new" as const),
    }),
    [useEditComposer, useComposer],
  );
};
