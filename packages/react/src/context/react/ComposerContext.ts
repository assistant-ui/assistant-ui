import { useMemo } from "react";
import { useMessageContext } from "./MessageContext";
import { useThreadContext } from "./ThreadContext";
import type { ThreadComposerState } from "../stores/ThreadComposer";
import { ReadonlyStore } from "../ReadonlyStore";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { EditComposerState } from "../../api/ComposerRuntime";

export type ComposerContextValue = {
  useComposer: ReadonlyStore<EditComposerState | ThreadComposerState>;
  type: "edit" | "new";
};

export const useComposerContext = (): ComposerContextValue => {
  const { useComposer } = useThreadContext();
  const { useEditComposer } = useMessageContext({ optional: true }) ?? {};
  return useMemo(
    () => ({
      useComposer: (useEditComposer ?? useComposer) as ReadonlyStore<
        EditComposerState | ThreadComposerState
      >,
      type: useEditComposer ? ("edit" as const) : ("new" as const),
    }),
    [useEditComposer, useComposer],
  );
};

export const { useComposer, useComposerStore } = createContextStoreHook(
  useComposerContext,
  "useComposer",
);
